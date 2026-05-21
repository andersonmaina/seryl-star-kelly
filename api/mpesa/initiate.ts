// api/mpesa/initiate.ts
// Vercel Serverless Function — triggers an M-Pesa STK Push via SmartPay.

// ── In-memory rate limiter ───────────────────────────────────────────────────
// Limits STK Push requests to 3 per phone number per 60 seconds.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 60_000

function checkRateLimit(phone: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const record = rateLimitMap.get(phone)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, retryAfter: 0 }
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }
  record.count++
  return { allowed: true, retryAfter: 0 }
}

// ── Idempotency map ─────────────────────────────────────────────────────────
// Key: userId + amount + 2-minute time bucket.
const idempotencyMap = new Map<string, { orderId: string; expiresAt: number }>()
const IDEMPOTENCY_WINDOW = 2 * 60_000

function getIdempotencyKey(userId: string | undefined, amount: number): string {
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW)
  return `${userId ?? 'guest'}_${Math.round(amount)}_${bucket}`
}

function resolveIdempotency(key: string, newOrderId: string): { orderId: string; isDuplicate: boolean } {
  const now = Date.now()
  const existing = idempotencyMap.get(key)
  if (existing && now < existing.expiresAt) {
    return { orderId: existing.orderId, isDuplicate: true }
  }
  idempotencyMap.set(key, { orderId: newOrderId, expiresAt: now + IDEMPOTENCY_WINDOW })
  return { orderId: newOrderId, isDuplicate: false }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const MPESA_API_URL = process.env.MPESA_API_URL
  const MPESA_API_KEY = process.env.MPESA_API_KEY

  if (!MPESA_API_URL || !MPESA_API_KEY) {
    console.error('[initiate] Missing environment variables')
    return res.status(500).json({ success: false, message: 'Server configuration error' })
  }

  const { phone, amount, description, userId } = req.body

  if (!phone || !amount) {
    return res.status(400).json({ success: false, message: 'Phone and amount are required' })
  }

  // ── Format phone to 2547XXXXXXXX ─────────────────────────────────────────
  let formattedPhone = String(phone).replace(/\D/g, '')
  if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
    formattedPhone = '254' + formattedPhone.slice(1)
  } else if (formattedPhone.length === 9) {
    formattedPhone = '254' + formattedPhone
  }

  // ── Rate limit check ──────────────────────────────────────────────────────
  const rl = checkRateLimit(formattedPhone)
  if (!rl.allowed) {
    return res.status(429).json({
      success: false,
      message: `Too many payment requests. Please wait ${rl.retryAfter} seconds before trying again.`,
    })
  }

  // ── Idempotency check ─────────────────────────────────────────────────────
  const rawOrderId = `smo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const idempotencyKey = getIdempotencyKey(userId, parseFloat(amount))
  const { orderId, isDuplicate } = resolveIdempotency(idempotencyKey, rawOrderId)

  if (isDuplicate) {
    return res.status(200).json({
      success: true,
      orderId,
      isDuplicate: true,
      message: 'Payment already in progress. Please check your phone for the M-Pesa prompt.',
    })
  }

  // ── Trigger STK Push via SmartPay ────────────────────────────────────────
  let smartPayData: any
  let rawText = ''
  try {
    const smartPayRes = await fetch(MPESA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': MPESA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        amount: parseFloat(amount),
        account_reference: orderId,
        description: description || 'SmartOnline Purchase',
      }),
    })
    rawText = await smartPayRes.text()
    smartPayData = JSON.parse(rawText)
  } catch (err) {
    console.error('[initiate] SmartPay request failed:', err)
    console.error('[initiate] Raw response was:', rawText)
    return res.status(500).json({ success: false, message: 'Could not reach payment provider' })
  }

  console.log('[initiate] SmartPay response:', JSON.stringify(smartPayData))

  if (smartPayData?.success === true) {
    const checkoutRequestId =
      smartPayData?.checkoutRequestID ||
      smartPayData?.checkoutRequestId ||
      smartPayData?.CheckoutRequestID ||
      smartPayData?.data?.checkoutRequestID ||
      smartPayData?.data?.CheckoutRequestID ||
      null

    return res.status(200).json({
      success: true,
      orderId,
      checkoutRequestId: checkoutRequestId ?? null,
      message: smartPayData.message || 'STK Push sent. Check your phone.',
    })
  }

  return res.status(200).json({
    success: false,
    message: smartPayData?.error || smartPayData?.message || 'Payment initiation failed',
  })
}
