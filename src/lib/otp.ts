/**
 * OTP handling.
 *
 * In dev mode (OTP_DEV_MODE=true in .env.local):
 *   - sendOtp() doesn't actually send anything, it just logs the code.
 *   - verifyOtp() accepts OTP_DEV_CODE (default "123456") for any number.
 *
 * In production mode (OTP_DEV_MODE=false):
 *   - sendOtp() generates a random 6-digit code, stores it in memory
 *     against the mobile number, and sends it via the EIT bulk SMS API.
 *   - verifyOtp() checks the entered code against what's stored.
 *
 * Required env vars for production mode:
 *   SMS_USER, SMS_PASS, SENDER_ID
 */

import axios from "axios";

const DEV_MODE = process.env.OTP_DEV_MODE !== "false"; // default true
const DEV_CODE = process.env.OTP_DEV_CODE || "123456";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory store for real OTPs.
// NOTE: this resets on server restart and doesn't work across multiple
// server instances / PM2 cluster mode with >1 process. Since this is a
// single VPS running a single PM2 instance, that's fine for now — swap
// for Redis or a MongoDB collection if you ever scale to multiple
// instances or need OTPs to survive restarts.
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an OTP to the given contact (mobile number).
 * @param contact - 10-digit mobile number, e.g. "9876543210"
 */
export async function sendOtp(
  contact: string
): Promise<{ success: boolean; message: string }> {
  if (!contact || contact.trim().length < 10) {
    return { success: false, message: "Invalid mobile number." };
  }

  if (DEV_MODE) {
    console.log(`[OTP][DEV MODE] OTP for ${contact} is ${DEV_CODE}`);
    return { success: true, message: "OTP sent (dev mode)." };
  }

  const code = generateOtpCode();
  otpStore.set(contact, { code, expiresAt: Date.now() + OTP_TTL_MS });

  const message = `Thank you for registering. Your OTP is ${code}. Echelon Institute of Technology! visit www.eitfaridabad.com or call +919999753763 for more updates..`;

  try {
    const response = await axios.get(
      "http://bulksms.saakshisoftware.in/api/mt/SendSMS",
      {
        params: {
          user: process.env.SMS_USER,
          password: process.env.SMS_PASS,
          senderid: process.env.SENDER_ID,
          channel: "Trans",
          DCS: 0,
          flashsms: 0,
          number: `91${contact}`, // no +, just 91 prefix
          text: message,
          route: 4,
        },
      }
    );

    console.log("SMS Response:", response.data);
    return { success: true, message: "OTP sent." };
  } catch (error) {
    // Roll back the stored OTP since it was never actually delivered.
    otpStore.delete(contact);
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("SMS Error:", errMessage);
    return { success: false, message: "Failed to send OTP. Please try again." };
  }
}

/**
 * Verify an OTP entered by the user.
 * @param contact - the mobile number the OTP was sent to
 * @param otp - the code the user entered
 */
export async function verifyOtp(
  contact: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  if (!contact || !otp) {
    return { success: false, message: "Mobile number and OTP are required." };
  }

  if (DEV_MODE) {
    if (otp === DEV_CODE) {
      return { success: true, message: "OTP verified (dev mode)." };
    }
    return { success: false, message: "Incorrect OTP." };
  }

  const entry = otpStore.get(contact);
  if (!entry) {
    return { success: false, message: "No OTP requested for this number." };
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(contact);
    return { success: false, message: "OTP expired. Please request a new one." };
  }
  if (entry.code !== otp) {
    return { success: false, message: "Incorrect OTP." };
  }

  otpStore.delete(contact);
  return { success: true, message: "OTP verified." };
}