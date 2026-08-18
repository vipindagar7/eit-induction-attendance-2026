# Attendance App — ECHELON institute of technology

QR-based event attendance capture: Name, Father's Name, Mobile (OTP-verified), Branch.
Saves to a local MongoDB and auto-appends every entry, serial-numbered, to a private
Google Sheet that only you have access to. Glassmorphism UI with animated background +
transitions (Framer Motion).

## 1. Setup

```bash
npm install
cp .env.local.example .env.local
```

Make sure MongoDB is running locally (`mongod`), then just run:

```bash
npm run dev
```

- `/` — the attendance form people fill out after scanning the QR code.
- `/qr` — put this on a screen/tablet at the entrance; it shows a QR code that opens `/`.

## 2. Google Sheets setup (one-time, ~5 minutes)

The app writes to your Sheet using a **service account** — a machine identity that only
has access to sheets *you* explicitly share with it. The sheet stays private to you; the
service account is not a public link.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project
   (or reuse one).
2. In "APIs & Services" → enable the **Google Sheets API**.
3. Go to "Credentials" → **Create Credentials → Service Account**. Give it any name.
4. Open the service account → **Keys** tab → **Add Key → Create new key → JSON**. This
   downloads a `.json` file — save it as `service-account.json` in the project root
   (already in `.gitignore`, won't be committed).
5. Open that JSON file and copy the `client_email` value (looks like
   `xxx@xxx.iam.gserviceaccount.com`).
6. Create your Google Sheet (or use an existing one) → click **Share** → paste that
   `client_email` in → give it **Editor** access → Share. This is the only account
   (besides you) that can touch the sheet.
7. Copy the Sheet ID from the sheet's URL:
   `https://docs.google.com/spreadsheets/d/`**`<THIS_PART>`**`/edit`
8. In `.env.local`, set:
   ```
   GOOGLE_SHEET_ID=<the id from step 7>
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json
   ```

That's it — the app will auto-create a header row (S.No, Name, Father's Name, Mobile
Number, Branch, Timestamp) the first time it writes, and every submission appends a new
row with the next serial number.

## 3. Wiring up real OTP (SMS)

Everything already calls two functions in `src/lib/otp.ts`:

```ts
sendOtp(mobile: string)
verifyOtp(mobile: string, otp: string)
```

Set `OTP_DEV_MODE=false` and fill in the "Real provider integration" blocks in that file
with whichever SMS API you pick (MSG91, Twilio, Fast2SMS, etc.) — nothing else in the app
needs to change.

## 4. Branch list

Edit `src/lib/branches.ts` — it's a plain array of strings used to populate the dropdown.

## 5. Logo / branding

Drop your logo file into `public/` (e.g. `public/logo.png`) and reference it in
`src/app/page.tsx`. Colors/gradients live in `src/app/globals.css` if you want to match
ECHELON institute of technology's exact palette.

## 6. Deploying

MongoDB is currently configured for `localhost`. When you move this to your VPS, either
run MongoDB on the same server and keep `MONGODB_URI=mongodb://127.0.0.1:27017/attendance`,
or point it at Atlas / another host by changing that one value. Same pattern as your other
apps — PM2 + nginx:

```bash
npm run build
pm2 start npm --name attendance-app -- start
```

Also copy `service-account.json` to the server (outside of git) and make sure
`GOOGLE_SERVICE_ACCOUNT_KEY_PATH` points to it there.
