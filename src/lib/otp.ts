import prisma from "./prisma";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

/**
 * Generate a random numeric OTP code
 */
export function generateOtpCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

/**
 * Create and store OTP code for phone or email
 */
export async function createOtp(params: { phone?: string; email?: string }) {
  const { phone, email } = params;

  if (!phone && !email) {
    throw new Error("Phone or email is required");
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing unused OTPs for this contact
  if (phone) {
    await prisma.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });
  }
  if (email) {
    await prisma.otpCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    });
  }

  // Create new OTP
  const otp = await prisma.otpCode.create({
    data: {
      code,
      phone,
      email,
      expiresAt,
    },
  });

  return { code, expiresAt, id: otp.id };
}

/**
 * Verify OTP code
 */
export async function verifyOtp(params: {
  code: string;
  phone?: string;
  email?: string;
}): Promise<{ valid: boolean; error?: string }> {
  const { code, phone, email } = params;

  if (!phone && !email) {
    return { valid: false, error: "Phone or email is required" };
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      code,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      used: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { valid: false, error: "Invalid OTP code" };
  }

  // Check if expired
  if (new Date() > otp.expiresAt) {
    return { valid: false, error: "OTP code has expired" };
  }

  // Mark as used
  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return { valid: true };
}

/**
 * Send OTP via SMS (Twilio) - placeholder for now
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  // TODO: Implement Twilio integration
  console.log(`[OTP SMS] Sending code ${code} to ${phone}`);
  
  // In development, just log the code
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] OTP Code for ${phone}: ${code}`);
    return true;
  }

  // Production: Use Twilio
  // const twilio = require('twilio')(
  //   process.env.TWILIO_ACCOUNT_SID,
  //   process.env.TWILIO_AUTH_TOKEN
  // );
  // await twilio.messages.create({
  //   body: `Your Tipsio login code is: ${code}`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });

  return true;
}

/**
 * Send OTP via Email (Resend) - placeholder for now
 */
export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  // TODO: Implement Resend integration
  console.log(`[OTP Email] Sending code ${code} to ${email}`);
  
  // In development, just log the code
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] OTP Code for ${email}: ${code}`);
    return true;
  }

  // Production: Use Resend
  // const { Resend } = require('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'Tipsio <noreply@tipsio.com>',
  //   to: email,
  //   subject: 'Your Tipsio Login Code',
  //   text: `Your login code is: ${code}. It expires in 5 minutes.`,
  // });

  return true;
}
