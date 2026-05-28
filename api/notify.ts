import type { VercelRequest, VercelResponse } from '@vercel/node'

const PHONE_ID  = process.env.WA_PHONE_ID!
const TOKEN     = process.env.WA_TOKEN!
const RECIPIENTS = (process.env.WA_RECIPIENTS ?? '').split(',').map(s => s.trim()).filter(Boolean)

async function sendMessage(to: string, body: string) {
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
        type: 'text',
        text: { body },
      }),
    }
  )
  const data = await res.json()
  return { to, ok: res.ok, status: res.status, data }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, recipients } = req.body as { message: string; recipients?: string[] }

  if (!message) return res.status(400).json({ error: 'message required' })
  if (!PHONE_ID || !TOKEN) return res.status(500).json({ error: 'WA not configured' })

  const targets = recipients ?? RECIPIENTS
  if (targets.length === 0) return res.status(500).json({ error: 'No recipients configured' })

  const results = await Promise.allSettled(targets.map(to => sendMessage(to, message)))

  const summary = results.map(r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason })
  const allOk = summary.every((r: any) => r.ok)

  return res.status(allOk ? 200 : 207).json({ results: summary })
}
