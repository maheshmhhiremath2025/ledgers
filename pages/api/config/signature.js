import { connectDB } from '../../../lib/mongodb'
import OrgConfig from '../../../models/OrgConfig'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  await connectDB()
  const orgId = req.headers['x-org-id'] || 'default'

  try {
    const { signatureImage } = req.body
    console.log('[signature] orgId:', orgId, 'hasImage:', !!signatureImage, 'size:', signatureImage?.length)
    // Only update signatureImage — never touch other fields
    const result = await OrgConfig.findOneAndUpdate(
      { orgId },
      { $set: { signatureImage: signatureImage || '' } },
      { upsert: true, new: true }
    )
    console.log('[signature] saved, result signatureImage length:', result?.signatureImage?.length)
    return res.status(200).json({ success: true, saved: !!result?.signatureImage })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}