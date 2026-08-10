import "server-only";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_FROM,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.APP_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset your theabernathypack password",
    text: `We received a request to reset your theabernathypack password.\n\nReset it here: ${url}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}
