# DeKUT Services - Payment Shell Site (Vite & TypeScript Version)

A clean, standalone, modern shell clone of the DeKUT Services website. This codebase is converted to **TypeScript** and bundled using **Vite**. All Cloudflare scripts, ASP.NET Core CSS isolation artifacts, and active `dkut.ac.ke` API dependencies have been fully stripped to make it a standalone prototype shell site, perfect for payment SDK integration.

## 🚀 Key Features

* **Vite Multi-Page Build**: Supports independent entry points for the Homepage (`index.html`), Make Payments (`Payment/Payment.html`), Application Fee (`Payment/ApplicationFeePayment.html`), and Endowment Fund (`Payment/EndowmentFundPayment.html`).
* **100% TypeScript Architecture**: All form validation, interactive field syncing, and student name lookups are separated into dedicated, typed modules under the `src/` directory:
  - `src/payment.ts` for Make Payments.
  - `src/applicationFee.ts` for Application Fees.
  - `src/endowmentFund.ts` for the Endowment Fund.
* **Premium Standalone CSS Styling**: Substituted the empty HTTrack placeholder references with elegant, high-performance, and responsive pure CSS radial-and-linear gradients.
* **Local Interactive Mock Database**: Form interactions (like searching for a student registration number) run completely standalone using a local mock database inside the script modules.
* **Mock STK Push Success Alerts**: Form submissions display mock M-Pesa STK push success notifications, showing detailed transaction information.
* **Bootstrap Integration**: Removed HTTrack local mirror folders and switched to public, high-performance JSDelivr CDN links for Bootstrap styles and scripts.

---

## 📂 Project Structure

```text
A:\MAJORIS\Normal\Projects\eciti\
├── index.html                   # Main landing page
├── package.json                 # Project dependencies & scripts
├── tsconfig.json                # TypeScript compilation config
├── vite.config.ts               # Vite multi-page configuration
├── README.md                    # Developer guidelines
├── Payment/                     # Sub-pages
│   ├── Payment.html             # Fee payment page
│   ├── ApplicationFeePayment.html # Application fee page
│   └── EndowmentFundPayment.html # Endowment fund payment page
├── css/                         # Clean stylesheets
│   ├── layout.css               # Core layout
│   ├── staffstudentdash.css     # Homepage dashboard stylings
│   ├── payment.css              # Main payment forms styling
│   └── applicationfeepayment.css # Application form specific styling
├── img/                         # Asset folder
│   └── logo.png                 # Copied University brand logo
└── src/                         # Core TypeScript source logic
    ├── payment.ts               # Make payments page logic
    ├── applicationFee.ts        # Application fee page logic
    └── endowmentFund.ts         # Endowment fund page logic
```

---

## 🛠️ Getting Started

### 1. Installation
Install the project dependencies (Vite & TypeScript compiler):
```bash
pnpm install
# or
npm install
# or
yarn install
```

### 2. Run the Development Server
Launch the local development environment:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
To compile and build optimal static assets in `dist/`:
```bash
npm run build
```

---

## 💡 Mock Database Information
When entering a registration number on the **Make Payments** screen:
- Typing `D12345` displays **"Alice Wambui (Mock Student)"**.
- Typing `C026` displays **"John Doe (Mock Student)"**.
- Typing `E54321` displays **"Grace Nyambura (Mock Student)"**.
- Any other input displays **"David Kiprop (Mock Student)"** for prototyping purposes.

---

## 💳 Integrating the Payment SDK Later
When you are ready to integrate the payment SDK (such as M-Pesa STK, PesaFlow, etc.), open the files inside `src/`:
1. In `src/payment.ts`, replace the form `submit` event listener with a call to your backend payment endpoint or payment SDK trigger.
2. Ensure you forward the values from:
   - `amountExpected` (Amount in KES)
   - `msisdn` (STK Phone number)
   - `regInput` (Student Registration Number)
   - `studentName` (Retrieved via lookup)
3. You can configure a proxy inside `vite.config.ts` if your payment SDK or API backend runs on a different port (e.g., Express, NestJS, etc.).
