import { useState } from 'react'

// <AttachmentUploader value={[...]} onChange={list => ...} headers={headers} toast={toast} />
// value = array of { url, name, size, contentType }
export default function AttachmentUploader({ value = [], onChange, headers, toast, maxSizeMB = 10 }) {
  const [uploading, setUploading] = useState(false)

  const upload = async (file) => {
    if (!file) return
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast(`File too large — max ${maxSizeMB} MB`, 'error')
      return
    }
    setUploading(true)
    try {
      const r = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
          ...(headers || {}),
          'Content-Type': file.type || 'application/octet-stream',
        },
        credentials: 'include',
        body: file,
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      onChange([...(value || []), { url: d.url, name: file.name, size: d.size || file.size, contentType: d.contentType || file.type }])
      toast('✓ File uploaded')
    } catch (e) {
      toast(e.message || 'Upload failed', 'error')
    }
    setUploading(false)
  }

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))

  const fmtSize = (b) => !b ? '' : b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(1)} MB`

  return (
    <div>
      <label style={{ display:'inline-block', padding:'8px 14px', background:'var(--surface-2)', border:'1px dashed var(--border-2)', borderRadius:'var(--r)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize:12, color:'var(--text-2)', fontFamily:'var(--font)' }}>
        {uploading ? '⏳ Uploading…' : '📎 Attach file'}
        <input type="file" disabled={uploading} onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} style={{ display:'none' }}/>
      </label>
      {value && value.length > 0 && (
        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
          {value.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--surface-2)', borderRadius:'var(--r)', fontSize:12 }}>
              <span style={{ fontSize:14 }}>📄</span>
              <a href={a.url} target="_blank" rel="noreferrer" style={{ color:'var(--accent-2)', textDecoration:'none', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</a>
              <span style={{ color:'var(--text-4)', fontSize:10 }}>{fmtSize(a.size)}</span>
              <button onClick={() => remove(i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14, fontFamily:'var(--font)' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
