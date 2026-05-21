import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables from .env
  const env = loadEnv(mode, process.cwd(), '')

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          payment: resolve(__dirname, 'Payment/Payment.html'),
          paymentPesaFlow: resolve(__dirname, 'Payment/PaymentPesaFlow.html'),
          applicationFee: resolve(__dirname, 'Payment/ApplicationFeePayment.html'),
          endowmentFund: resolve(__dirname, 'Payment/EndowmentFundPayment.html'),
        },
      },
    },
    server: {
      port: 5173,
    },
    plugins: [
      {
        name: 'mpesa-stkpush-api',
        configureServer(server) {
          // Custom in-memory rate limit & idempotency maps for standalone development
          const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
          const idempotencyMap = new Map<string, { orderId: string; expiresAt: number }>()

          server.middlewares.use(async (req, res, next) => {
            if ((req.url === '/api/mpesa/initiate' || req.url === '/api/mpesa/initiate.php') && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => { body += chunk })
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body)
                  const { phone, amount, description, userId } = payload

                  if (!phone || !amount) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ success: false, message: 'Phone and amount are required' }))
                  }

                  // ── Format phone to 2547XXXXXXXX ─────────────────────────────────
                  let formattedPhone = String(phone).replace(/\D/g, '')
                  if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
                    formattedPhone = '254' + formattedPhone.slice(1)
                  } else if (formattedPhone.length === 9) {
                    formattedPhone = '254' + formattedPhone
                  }

                  // ── Rate Limit (Max 3 pushes per 60s per number) ───────────────────
                  const now = Date.now()
                  const rlRecord = rateLimitMap.get(formattedPhone)
                  if (rlRecord && now <= rlRecord.resetAt && rlRecord.count >= 3) {
                    const retryAfter = Math.ceil((rlRecord.resetAt - now) / 1000)
                    res.writeHead(429, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({
                      success: false,
                      message: `Too many payment requests. Please wait ${retryAfter} seconds before trying again.`
                    }))
                  }

                  if (!rlRecord || now > rlRecord.resetAt) {
                    rateLimitMap.set(formattedPhone, { count: 1, resetAt: now + 60000 })
                  } else {
                    rlRecord.count++
                  }

                  // ── Idempotency (2 min bucket for user+amount) ─────────────────────
                  const bucket = Math.floor(now / 120000)
                  const idempotencyKey = `${userId || 'guest'}_${Math.round(parseFloat(amount))}_${bucket}`
                  const existingIdemp = idempotencyMap.get(idempotencyKey)

                  if (existingIdemp && now < existingIdemp.expiresAt) {
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({
                      success: true,
                      orderId: existingIdemp.orderId,
                      isDuplicate: true,
                      message: 'Payment already in progress. Please check your phone for the M-Pesa prompt.'
                    }))
                  }

                  const orderId = `smo_${now}_${Math.random().toString(36).substring(2, 9)}`
                  idempotencyMap.set(idempotencyKey, { orderId, expiresAt: now + 120000 })

                  const MPESA_API_URL = env.MPESA_API_URL
                  const MPESA_API_KEY = env.MPESA_API_KEY

                  if (!MPESA_API_URL || !MPESA_API_KEY) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ success: false, message: 'Server configuration error (missing env variables)' }))
                  }

                  // ── Send STK Push request to SmartPay API ──────────────────────────
                  const mpesaResponse = await fetch(MPESA_API_URL, {
                    method: 'POST',
                    headers: {
                      'Authorization': MPESA_API_KEY,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      phone: formattedPhone,
                      amount: parseFloat(amount),
                      account_reference: orderId,
                      description: description || 'DKUT Payment Service'
                    })
                  })

                  const mpesaText = await mpesaResponse.text()
                  const smartPayData = JSON.parse(mpesaText)

                  if (smartPayData?.success === true) {
                    const checkoutRequestId =
                      smartPayData?.checkoutRequestID ||
                      smartPayData?.checkoutRequestId ||
                      smartPayData?.CheckoutRequestID ||
                      smartPayData?.data?.checkoutRequestID ||
                      smartPayData?.data?.CheckoutRequestID ||
                      null

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({
                      success: true,
                      orderId,
                      checkoutRequestId,
                      message: smartPayData.message || 'STK Push sent successfully. Please enter your PIN on your phone.'
                    }))
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  return res.end(JSON.stringify({
                    success: false,
                    message: smartPayData?.error || smartPayData?.message || 'Payment initiation failed'
                  }))

                } catch (err: any) {
                  console.error('[STK API Error]', err)
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  return res.end(JSON.stringify({ success: false, message: 'Internal server error: ' + err.message }))
                }
              })
            } else {
              next()
            }
          })
        }
      }
    ]
  }
})
