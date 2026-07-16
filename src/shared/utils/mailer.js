import nodemailer from 'nodemailer';

let transporterInstance = null;

const getTransporter = () => {
  if (transporterInstance) return transporterInstance;

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  transporterInstance = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.sumopod.com',
    port: port,
    secure: port === 465, // SSL: True jika port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporterInstance;
};

export const getSenderEmail = () => {
  return process.env.SMTP_FROM || 'noreply@podorukuntrack.com';
};

export const sendMailAsync = async (mailOptions) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Mocking email sending to:', mailOptions.to);
    return true;
  }

  const transporter = getTransporter();
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${mailOptions.to}: %s`, info.messageId);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${mailOptions.to}:`, error.message || error);
    throw new Error(`Gagal mengirim email: ${error.message || 'Pastikan konfigurasi SMTP benar.'}`);
  }
};

const getBaseFrontendUrl = () => {
  const urls = process.env.FRONTEND_URL || 'https://podorukuntrack.com';
  return urls.split(',')[0].trim();
};

export const emailFooter = `
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
  <div style="color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: justify;">
    <p style="margin: 0 0 10px 0;"><strong>Podorukun Group</strong> adalah perusahaan yang bergerak di bidang developer properti, berlokasi di Jl. Akordion Perumahan Permata Tunggulwulung Kav. 08, Lowokwaru, Kota Malang, Jawa Timur.</p>
    <p style="margin: 0 0 10px 0;">Didirikan pada tanggal 29 Januari 2015 dengan bentuk badan hukum Perseroan Terbatas di Kota Malang, berdasarkan Akte Pendirian No. 80 yang dibuat di hadapan Notaris Atik Rusmiati.</p>
    <p style="margin: 0;"><strong>Bantuan & Layanan:</strong> WA 6281255510111</p>
  </div>
`;

export const sendHandoverNotification = (adminEmails, handoverDetails) => {
  // Fire and forget (Background task)
  Promise.resolve().then(async () => {
    if (!adminEmails || adminEmails.length === 0) return;

    const { handoverId, unitNumber, status, proposedDateText } = handoverDetails;
    const frontendUrl = getBaseFrontendUrl();
    const actionUrl = `${frontendUrl}/admin/handovers/${handoverId}`; // Asumsi routing frontend admin
    
    let actionText = '';
    if (proposedDateText) {
       actionText = `<p style="color: #334155; font-size: 16px;">Customer telah menyesuaikan jadwal serah terima menjadi tanggal <strong>${proposedDateText}</strong>.</p>`;
    } else {
       actionText = `<p style="color: #334155; font-size: 16px;">Status serah terima unit saat ini telah diubah menjadi: <strong style="text-transform: uppercase; color: #b51318;">${status}</strong>.</p>`;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #b51318; text-align: center;">Podorukun Track - Admin Notifikasi</h2>
        <p style="color: #334155; font-size: 16px;">Halo Admin,</p>
        <p style="color: #334155; font-size: 16px;">Terdapat pembaruan respons serah terima (handover) dari Customer untuk unit <strong>${unitNumber || 'Terkait'}</strong>.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #b51318; padding: 15px; margin: 20px 0;">
          ${actionText}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}" style="background-color: #b51318; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Detail Serah Terima</a>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">Email ini dibuat secara otomatis oleh sistem Podorukun Track.</p>
        ${emailFooter}
      </div>
    `;

    // Mengirim ke setiap admin secara individual
    const promises = adminEmails.map(email => {
      if (!email) return Promise.resolve();
      
      const mailOptions = {
        from: \`"Podorukun Track" <\${getSenderEmail()}>\`,
        to: email,
        subject: \`Pembaruan Serah Terima Unit \${unitNumber || ''}\`,
        html: htmlContent
      };
      
      return sendMailAsync(mailOptions).catch(err => {
        console.error(\`Background Email Notification Error for \${email}:\`, err.message);
      });
    });

    await Promise.allSettled(promises);
  }).catch(globalErr => {
    console.error('Fatal Error in sendHandoverNotification background task:', globalErr);
  });
};
