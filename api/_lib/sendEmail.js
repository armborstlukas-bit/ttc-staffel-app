import nodemailer from 'nodemailer';

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER/GMAIL_APP_PASSWORD nicht konfiguriert');
  }
  await getTransporter().sendMail({
    from: `"TTC Grün-Weiß Staffel" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
