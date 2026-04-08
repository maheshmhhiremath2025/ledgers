// TOTP RFC 6238 implementation using Node crypto. No third-party deps.
import crypto from 'crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf) {
  let bits = '', out = ''
  for (const b of buf) bits += b.toString(2).padStart(8, '0')
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  return out
}

export function base32Decode(str) {
  const clean = str.replace(/=+$/, '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const c of clean) {
    const v = ALPHABET.indexOf(c)
    if (v < 0) continue
    bits += v.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

export function generateSecret(length = 20) {
  return base32Encode(crypto.randomBytes(length))
}

export function totp(secretBase32, { step = 30, digits = 6, time } = {}) {
  const t = Math.floor((time || Date.now()) / 1000 / step)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(t))
  const key = base32Decode(secretBase32)
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return String(code % 10 ** digits).padStart(digits, '0')
}

// Verify with ±1 step window for clock drift
export function verifyTotp(secretBase32, token, opts = {}) {
  if (!token || !secretBase32) return false
  const clean = String(token).replace(/\s+/g, '')
  for (const skew of [-1, 0, 1]) {
    const t = (opts.time || Date.now()) + skew * 30 * 1000
    if (totp(secretBase32, { ...opts, time: t }) === clean) return true
  }
  return false
}

// Build the otpauth:// URI for QR codes
export function otpauthUrl({ secret, label, issuer = 'HexaLabs Books' }) {
  const enc = encodeURIComponent
  return `otpauth://totp/${enc(issuer)}:${enc(label)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`
}
