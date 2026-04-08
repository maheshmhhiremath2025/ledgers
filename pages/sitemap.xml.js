const BASE = process.env.APP_URL || 'https://ledgers.hexalabs.online'

const PAGES = [
  { loc: '/',         priority: 1.0, changefreq: 'weekly'  },
  { loc: '/pricing',  priority: 0.9, changefreq: 'weekly'  },
  { loc: '/terms',    priority: 0.3, changefreq: 'yearly'  },
  { loc: '/privacy',  priority: 0.3, changefreq: 'yearly'  },
  { loc: '/refund',   priority: 0.3, changefreq: 'yearly'  },
]

function buildXml() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = PAGES.map(p => `  <url>
    <loc>${BASE}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate')
  res.write(buildXml())
  res.end()
  return { props: {} }
}

export default function Sitemap() { return null }
