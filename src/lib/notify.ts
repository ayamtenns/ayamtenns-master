// WA Cloud API — token expires ~25 Jul 2026, renew via Meta developers.facebook.com
const WA_TOKEN    = 'EAAYCwIZAjZCZBYBRrA8qFnp58svSZAmeHbvVEBDCd79mM0Gerqyn7qhIZBAkAfYcJ6FEbr2GHPdSCdlNTTBQ1kMMIPkZBMFXqq1WGGuNgafeS4ZBwV4mPZCZCRpK2LPvPSoaNi6AdEQuhacUCk4dqiWDmQyNZAVfWrqP99gLitIwNqmZCCsXIlC46EtKNVljqouUGOV'
const WA_PHONE_ID = '1066597959881230'
const RECIPIENTS  = ['6285939512330', '628111779957']

/**
 * Send a WhatsApp notification via Meta Cloud API.
 * Fire-and-forget — never throws, so it never blocks the main operation.
 */
export async function notifyWA(message: string): Promise<void> {
  await Promise.allSettled(
    RECIPIENTS.map(to =>
      fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      }).catch(() => {/* silent fail */})
    )
  )
}
