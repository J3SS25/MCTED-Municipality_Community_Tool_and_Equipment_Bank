const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email delivery is not configured.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendVerificationCode(email, code, purpose) {
  const subject = purpose === 'registration'
    ? 'Verify your MCTEB email address'
    : purpose === 'email-change'
      ? 'Verify your new MCTEB email address'
      : 'Your MCTEB password reset code';

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text: `Your MCTEB verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your MCTEB verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>`
  });
}

module.exports = { sendVerificationCode };
