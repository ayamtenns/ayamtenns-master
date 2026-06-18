import type { VercelRequest, VercelResponse } from '@vercel/node'

const PHONE_ID   = process.env.WA_PHONE_ID!
const TOKEN      = process.env.WA_TOKEN!
const RECIPIENTS = (process.env.WA_RECIPIENTS ?? '').split(',').map(s => s.trim()).filter(Boolean)

async function sendKeepalive(to: string) {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: 'ayamtenns_keepalive',
          language: { code: 'id' },
        },
      }),
    }
  )
  return { to, ok: res.ok, status: res.status, data: await res.json() }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET from cron or POST for manual trigger
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!PHONE_ID || !TOKEN) return res.status(500).json({ error: 'WA not configured' })
  if (RECIPIENTS.length === 0) return res.status(500).json({ error: 'No recipients configured' })

  const results = await Promise.allSettled(RECIPIENTS.map(to => sendKeepalive(to)))
  const summary = results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason })
  const allOk   = summary.every((r: any) => r.ok)

  return res.status(allOk ? 200 : 207).json({ results: summary, sent_at: new Date().toISOString() })
}
