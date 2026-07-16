import { sendMailAsync, getSenderEmail, emailFooter } from '../../shared/utils/mailer.js';

export const sendOTPByEmail = async (to, otp) => {
  const mailOptions = {
    from: `"Podorukun Track" <${getSenderEmail()}>`,
    to,
    subject: 'Kode OTP Lupa Password',
    text: `Kode OTP Anda adalah: ${otp}. Kode ini berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #b51318; text-align: center;">Podorukun Track</h2>
        <p style="color: #334155; font-size: 16px;">Halo,</p>
        <p style="color: #334155; font-size: 16px;">Anda baru saja meminta pengaturan ulang password. Berikut adalah kode OTP Anda:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <strong style="font-size: 32px; letter-spacing: 5px; color: #0f172a;">${otp}</strong>
        </div>
        <p style="color: #64748b; font-size: 14px;">Kode ini hanya berlaku selama <strong>5 menit</strong>. Jika Anda tidak meminta kode ini, abaikan email ini.</p>
        <p style="color: #334155; font-size: 16px; margin-top: 30px;">Terima kasih,<br/>Tim Podorukun Track</p>
        ${emailFooter}
      </div>
    `,
  };

  await sendMailAsync(mailOptions);
  return true;
};
