let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

/**
 * Renders HTML template for Play Arena emails.
 */
const renderEmailTemplate = (title, contentHtml) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155; overflow: hidden; }
        .header { background-color: #0284c7; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
        .body-content { padding: 24px; line-height: 1.6; color: #e2e8f0; }
        .info-card { background-color: #0f172a; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .info-card p { margin: 6px 0; }
        .footer { background-color: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PLAY ARENA</h1>
        </div>
        <div class="body-content">
          ${contentHtml}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Play Arena Indoor Sports & Gaming. All rights reserved.</p>
          <p>This is an automated operational notification. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate specific email HTML and text bodies based on event type.
 */
const generateEmailContent = (type, data) => {
  let subject = 'Play Arena Notification';
  let text = '';
  let html = '';

  switch (type) {
    case 'booking_confirmed': {
      subject = `Booking Confirmed #${data.bookingReference || data.bookingId} - Play Arena`;
      text = `Your booking for ${data.gameName || 'Game'} (${data.resourceName || 'Resource'}) on ${data.bookingDate} from ${data.startTime} to ${data.endTime} is CONFIRMED. Total Paid: ₹${data.totalAmount}. Please arrive 10 minutes before your time slot.`;
      html = renderEmailTemplate(
        'Booking Confirmed',
        `
        <h2>Booking Confirmed!</h2>
        <p>Hi ${data.userName || 'Customer'},</p>
        <p>Great news! Your booking at Play Arena has been successfully confirmed.</p>
        <div class="info-card">
          <p><strong>Booking Reference:</strong> #${data.bookingReference || data.bookingId}</p>
          <p><strong>Game:</strong> ${data.gameName || 'N/A'}</p>
          <p><strong>Resource:</strong> ${data.resourceName || 'N/A'}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time Slot:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Duration:</strong> ${data.durationMinutes || 60} mins</p>
          <p><strong>Total Amount:</strong> ₹${data.totalAmount}</p>
        </div>
        <p><strong>Check-in Instructions:</strong> Please present your booking reference at the front desk when you arrive. We recommend arriving 10 minutes prior to your scheduled time.</p>
        `
      );
      break;
    }
    case 'payment_success': {
      subject = `Payment Receipt for Booking #${data.bookingReference || data.bookingId} - Play Arena`;
      text = `Payment of ₹${data.amount} for Booking #${data.bookingReference || data.bookingId} was SUCCESSFUL. Payment Ref: ${data.paymentId}.`;
      html = renderEmailTemplate(
        'Payment Receipt',
        `
        <h2>Payment Successful</h2>
        <p>Hi ${data.userName || 'Customer'},</p>
        <p>We have successfully received your payment for your Play Arena booking.</p>
        <div class="info-card">
          <p><strong>Payment Reference:</strong> ${data.paymentId}</p>
          <p><strong>Booking Reference:</strong> #${data.bookingReference || data.bookingId}</p>
          <p><strong>Amount Paid:</strong> ₹${data.amount}</p>
          <p><strong>Payment Status:</strong> Paid</p>
          <p><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        `
      );
      break;
    }
    case 'booking_cancelled': {
      subject = `Booking Cancelled #${data.bookingReference || data.bookingId} - Play Arena`;
      text = `Your booking for ${data.gameName || 'Game'} on ${data.bookingDate} (${data.startTime} - ${data.endTime}) has been CANCELLED.`;
      html = renderEmailTemplate(
        'Booking Cancelled',
        `
        <h2>Booking Cancellation Notice</h2>
        <p>Hi ${data.userName || 'Customer'},</p>
        <p>Your booking at Play Arena has been cancelled.</p>
        <div class="info-card">
          <p><strong>Booking Reference:</strong> #${data.bookingReference || data.bookingId}</p>
          <p><strong>Game:</strong> ${data.gameName || 'N/A'}</p>
          <p><strong>Original Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time Slot:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Status:</strong> Cancelled</p>
        </div>
        <p>If you have any questions regarding refunds or re-booking, please contact Play Arena support.</p>
        `
      );
      break;
    }
    case 'booking_reminder': {
      subject = `Upcoming Booking Reminder #${data.bookingReference || data.bookingId} - Play Arena`;
      text = `Reminder: You have an upcoming booking for ${data.gameName || 'Game'} tomorrow on ${data.bookingDate} from ${data.startTime} to ${data.endTime} at Play Arena!`;
      html = renderEmailTemplate(
        'Upcoming Booking Reminder',
        `
        <h2>Upcoming Session Reminder!</h2>
        <p>Hi ${data.userName || 'Customer'},</p>
        <p>This is a friendly reminder for your upcoming session at Play Arena.</p>
        <div class="info-card">
          <p><strong>Booking Reference:</strong> #${data.bookingReference || data.bookingId}</p>
          <p><strong>Game:</strong> ${data.gameName || 'N/A'}</p>
          <p><strong>Resource:</strong> ${data.resourceName || 'N/A'}</p>
          <p><strong>Date:</strong> ${data.bookingDate}</p>
          <p><strong>Time Slot:</strong> ${data.startTime} - ${data.endTime}</p>
        </div>
        <p>We look forward to seeing you soon! Please bring your sports footwear and arrive 10 minutes early.</p>
        `
      );
      break;
    }
    default: {
      subject = data.title || 'Play Arena Notification';
      text = data.message || '';
      html = renderEmailTemplate('Notification', `<p>${data.message || ''}</p>`);
    }
  }

  return { subject, text, html };
};

/**
 * Sends an email or logs simulation in dev/test mode.
 */
const sendEmail = async ({ to, type, data }) => {
  if (!to) {
    console.warn('[EmailService] Recipient email is missing. Skipping email.');
    return { status: 'skipped', reason: 'no_recipient' };
  }

  const { subject, text, html } = generateEmailContent(type, data);

  const env = process.env.NODE_ENV || 'development';
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  // Safe development / test mode transport simulation
  if (env === 'test' || env === 'development' || !hasSmtpConfig || !nodemailer) {
    console.log(`[EmailService - SIMULATED (${env})]`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Type: ${type}`);
    console.log(`  Text Preview: ${text.slice(0, 120)}...`);
    return { status: 'skipped', mode: 'simulated', subject };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Play Arena" <no-reply@playarena.com>',
      to,
      subject,
      text,
      html,
    });

    console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { status: 'sent', messageId: info.messageId };
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    return { status: 'failed', error: error.message };
  }
};

module.exports = {
  sendEmail,
  generateEmailContent,
  renderEmailTemplate,
};
