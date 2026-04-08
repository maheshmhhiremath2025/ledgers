import { put } from '@vercel/blob'
import { requireAuth } from '../../lib/auth'

export const config = {
  api: {
    bodyParser: false, // we read the raw stream
  },
}

// Simple direct upload to Vercel Blob.
// Client sends: POST /api/upload?filename=receipt.pdf  with body = the file bytes
// Response:     { url, pathname, contentType, size }
//
// Requires env var BLOB_READ_WRITE_TOKEN (auto-set when you link a Blob store in Vercel).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const auth = requireAuth(req, res); if (!auth) return

  const filename = String(req.query.filename || 'upload.bin')
  // Namespace per org so users can never collide or enumerate cross-org
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120)
  const path = `${auth.orgId}/${Date.now()}-${safe}`

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Blob storage not configured (BLOB_READ_WRITE_TOKEN missing)' })
  }

  try {
    const blob = await put(path, req, {
      access: 'public',
      addRandomSuffix: false,
      contentType: req.headers['content-type'] || 'application/octet-stream',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: blob.size || null,
    })
  } catch (e) {
    console.error('[upload] failed:', e)
    return res.status(500).json({ error: e.message || 'Upload failed' })
  }
}
