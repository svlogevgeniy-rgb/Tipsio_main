import { nanoid } from "nanoid";
import QRCode from "qrcode";

/**
 * Generate a unique short code for QR codes
 * Format: 8 characters, URL-safe
 */
export function generateShortCode(): string {
  return nanoid(8);
}

/**
 * Build the tip URL for a QR code
 */
export function buildTipUrl(shortCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/tip/${shortCode}`;
}

/**
 * Generate QR code as PNG buffer
 */
export async function generateQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Generate QR code as SVG string
 */
export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    width: 512,
    margin: 2,
  });
}

/**
 * Generate QR code as Data URL (for embedding in HTML/PDF)
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}
