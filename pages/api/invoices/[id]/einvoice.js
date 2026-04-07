import { connectDB } from '../../../../lib/mongodb'
import Invoice from '../../../../models/Invoice'
import OrgConfig from '../../../../models/OrgConfig'
import { requireAuth } from '../../../../lib/auth'
import { audit } from '../../../../lib/audit'

// GST e-Invoice IRN generation scaffold.
//
// To go live you need:
//  - A GSP (GST Suvidha Provider) account such as ClearTax/Masters India/IRIS/etc.
//  - The IRP sandbox/prod credentials (client_id, client_secret, GSTIN, username, password)
//  - Set env vars:  EINVOICE_PROVIDER_URL, EINVOICE_CLIENT_ID, EINVOICE_CLIENT_SECRET
//
// This endpoint validates eligibility, builds the IRP payload, calls the provider,
// and stores the returned IRN/QR/AckNo/AckDate on the invoice.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const auth = requireAuth(req, res); if (!auth) return
  const orgId = auth.orgId
  const { id } = req.query

  const [invoice, cfg] = await Promise.all([
    Invoice.findOne({ _id: id, orgId }),
    OrgConfig.findOne({ orgId }),
  ])
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
  if (invoice.irn) return res.status(400).json({ error: 'IRN already generated for this invoice', irn: invoice.irn })
  if (!cfg?.gstin) return res.status(400).json({ error: 'Org GSTIN not configured' })
  if (!invoice.customer?.gstin) return res.status(400).json({ error: 'Customer GSTIN required for B2B e-invoice' })

  const providerUrl = process.env.EINVOICE_PROVIDER_URL
  const clientId    = process.env.EINVOICE_CLIENT_ID
  const clientSecret= process.env.EINVOICE_CLIENT_SECRET
  if (!providerUrl || !clientId || !clientSecret) {
    return res.status(503).json({
      error: 'e-Invoice provider not configured',
      message: 'Set EINVOICE_PROVIDER_URL, EINVOICE_CLIENT_ID, EINVOICE_CLIENT_SECRET in environment',
    })
  }

  // Build IRP payload (NIC schema 1.1)
  const payload = {
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B', RegRev: 'N', EcmGstin: null, IgstOnIntra: 'N' },
    DocDtls:  { Typ: 'INV', No: invoice.invoiceNumber, Dt: new Date(invoice.issueDate).toLocaleDateString('en-GB').replace(/\//g, '/') },
    SellerDtls: {
      Gstin: cfg.gstin, LglNm: cfg.businessName || '', Addr1: cfg.businessAddress || '',
      Loc: cfg.businessCity || 'NA', Pin: Number(cfg.businessPincode || 0), Stcd: cfg.stateCode || '29',
    },
    BuyerDtls: {
      Gstin: invoice.customer.gstin, LglNm: invoice.customer.name, Addr1: invoice.customer.address || 'NA',
      Loc: 'NA', Pin: 0, Stcd: invoice.customer.stateCode || '29', Pos: invoice.customer.stateCode || '29',
    },
    ItemList: (invoice.lineItems || []).map((li, i) => ({
      SlNo: String(i + 1), PrdDesc: li.description, IsServc: 'Y',
      HsnCd: li.hsnCode || '998314',
      Qty: li.qty, Unit: 'NOS', UnitPrice: li.rate,
      TotAmt: li.amount, AssAmt: li.amount,
      GstRt: li.tax || 0, IgstAmt: ((li.amount * (li.tax || 0)) / 100),
      CgstAmt: 0, SgstAmt: 0, TotItemVal: li.amount + ((li.amount * (li.tax || 0)) / 100),
    })),
    ValDtls: {
      AssVal: invoice.subtotal, CgstVal: 0, SgstVal: 0, IgstVal: invoice.taxTotal,
      TotInvVal: invoice.total,
    },
  }

  try {
    const r = await fetch(`${providerUrl}/eivital/v1.04/Invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': clientId,
        'client-secret': clientSecret,
        'gstin': cfg.gstin,
      },
      body: JSON.stringify(payload),
    })
    const result = await r.json()
    if (!r.ok || result.Status !== 1) {
      return res.status(400).json({ error: 'IRP rejected', details: result })
    }

    invoice.irn          = result.Data?.Irn || ''
    invoice.irnAckNo     = String(result.Data?.AckNo || '')
    invoice.irnAckDate   = result.Data?.AckDt ? new Date(result.Data.AckDt) : null
    invoice.signedQrCode = result.Data?.SignedQRCode || ''
    await invoice.save()

    audit(req, auth, {
      action: 'invoice.einvoice.generate', entityType: 'Invoice',
      entityId: invoice._id, entityRef: invoice.invoiceNumber,
      meta: { irn: invoice.irn, ackNo: invoice.irnAckNo },
    })

    return res.status(200).json({
      irn: invoice.irn, ackNo: invoice.irnAckNo, ackDate: invoice.irnAckDate,
    })
  } catch (e) {
    return res.status(500).json({ error: 'IRP call failed: ' + e.message })
  }
}
