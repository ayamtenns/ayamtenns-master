import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { photoUrl } = req.body as { photoUrl: string }
  if (!photoUrl) return res.status(400).json({ error: 'photoUrl required' })
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  // Fetch image and convert to base64
  const imgRes = await fetch(photoUrl)
  if (!imgRes.ok) return res.status(400).json({ error: 'Failed to fetch image' })

  const contentTypeRaw = imgRes.headers.get('content-type') ?? 'image/jpeg'
  const mimeType = contentTypeRaw.split(';')[0].trim() || 'image/jpeg'
  const buffer = await imgRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            {
              text: 'This is a supplier invoice. Extract all purchased line items. Return ONLY a valid JSON array, no explanation:\n[{"itemName":"...","qty":0,"unit":"kg","unitPrice":0,"total":0}]\nNumbers must be plain integers/decimals, no commas or currency symbols.',
            },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    }
  )

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    return res.status(500).json({ error: 'Gemini API error', details: err })
  }

  const data = await geminiRes.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return res.status(500).json({ error: 'Could not parse response', raw: text })

  try {
    const items = JSON.parse(match[0])
    return res.status(200).json({ items })
  } catch {
    return res.status(500).json({ error: 'Invalid JSON from Gemini', raw: text })
  }
}
