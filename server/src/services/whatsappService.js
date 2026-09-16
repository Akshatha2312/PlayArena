/**
 * whatsappService.js
 * Provider abstraction layer for WhatsApp Business API delivery.
 *
 * Supports configuration via environment variables:
 * - WHATSAPP_ENABLED ('true' / 'false')
 * - WHATSAPP_PROVIDER ('official' / 'simulation')
 * - WHATSAPP_API_URL
 * - WHATSAPP_ACCESS_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 */

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  // Strip spaces, dashes, parentheses
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return null;

  // Validate E.164 pattern or basic international format (+ followed by digits, or minimum 10 digits)
  if (/^\+?[1-9]\d{7,14}$/.test(cleaned)) {
    if (!cleaned.startsWith('+')) {
      // Default fallback prefix +91 if 10 digits without country code
      if (cleaned.length === 10) {
        cleaned = `+91${cleaned}`;
      } else {
        cleaned = `+${cleaned}`;
      }
    }
    return cleaned;
  }
  return null;
};

const sendWhatsAppMessage = async ({ to, templateName, parameters, textFallback }) => {
  const normalizedPhone = normalizePhoneNumber(to);
  if (!normalizedPhone) {
    console.log(`[WhatsAppService] Invalid or missing phone number: "${to}". Skipping delivery.`);
    return { status: 'skipped', reason: 'invalid_phone' };
  }

  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  const provider = process.env.WHATSAPP_PROVIDER || 'simulation';
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Development / Test Simulation Mode or when WHATSAPP_ENABLED is not explicitly true
  if (!enabled || provider === 'simulation' || nodeEnv === 'test' || nodeEnv === 'development') {
    const sanitizedPreview = (textFallback || 'WhatsApp notification').slice(0, 100).replace(/[\r\n]/g, ' ');
    console.log(`[WhatsAppService - SIMULATED (${nodeEnv})]`);
    console.log(`  To: ${normalizedPhone}`);
    console.log(`  Template: ${templateName || 'custom_text'}`);
    console.log(`  Preview: ${sanitizedPreview}...`);

    return {
      status: 'sent',
      simulated: true,
      providerMessageId: `sim_wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
  }

  // Official WhatsApp Cloud API Provider Call
  try {
    const apiUrl = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken || !apiUrl) {
      console.warn('[WhatsAppService] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_API_URL in production environment.');
      return { status: 'failed', reason: 'unconfigured_provider' };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone.replace('+', ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components: parameters ? [{ type: 'body', parameters }] : [],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const sanitizedErr = data.error ? data.error.message : 'Unknown provider error';
      console.error('[WhatsAppService] Provider API call returned error:', sanitizedErr);
      return { status: 'failed', reason: sanitizedErr };
    }

    const providerMessageId = data.messages && data.messages[0] ? data.messages[0].id : `wa_${Date.now()}`;
    return { status: 'sent', providerMessageId };
  } catch (error) {
    console.error('[WhatsAppService] Network exception calling provider:', error.message);
    return { status: 'failed', reason: error.message };
  }
};

const sendBookingConfirmation = async ({ phone, data }) => {
  const textFallback = `Play Arena booking confirmed.\nBooking: #${data.bookingReference || 'BK'}\nGame: ${data.gameName || 'N/A'}\nResource: ${data.resourceName || 'N/A'}\nDate: ${data.bookingDate}\nTime: ${data.startTime} - ${data.endTime}`;
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'booking_confirmation',
    textFallback,
  });
};

const sendPaymentSuccess = async ({ phone, data }) => {
  const textFallback = `Play Arena Payment Received.\nBooking: #${data.bookingReference || 'BK'}\nAmount: ₹${data.amount}\nRef: ${data.paymentId}`;
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'payment_success',
    textFallback,
  });
};

const sendBookingCancellation = async ({ phone, data }) => {
  const textFallback = `Play Arena booking cancelled.\nBooking: #${data.bookingReference || 'BK'}\nGame: ${data.gameName || 'N/A'}\nDate: ${data.bookingDate}`;
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'booking_cancellation',
    textFallback,
  });
};

const sendBookingReschedule = async ({ phone, data }) => {
  const textFallback = `Play Arena booking rescheduled.\nBooking: #${data.bookingId}\nGame: ${data.gameName || 'N/A'}\nResource: ${data.resourceName || 'N/A'}`;
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'booking_reschedule',
    textFallback,
  });
};

const sendBookingReminder = async ({ phone, data }) => {
  const textFallback = `Play Arena Reminder: Upcoming session for ${data.gameName || 'Game'} (${data.resourceName || 'Court'}) on ${data.bookingDate} from ${data.startTime} to ${data.endTime}.`;
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'booking_reminder',
    textFallback,
  });
};

const sendWaitlistAvailable = async ({ phone, data }) => {
  const textFallback = `Play Arena Waitlist: Slot is now available for ${data.gameName || 'Game'} (${data.resourceName || 'Resource'})! Log in now to book.`;
  return sendWhatsAppMessage({
    to: phone,
    templateName: 'waitlist_available',
    textFallback,
  });
};

module.exports = {
  normalizePhoneNumber,
  sendWhatsAppMessage,
  sendBookingConfirmation,
  sendPaymentSuccess,
  sendBookingCancellation,
  sendBookingReschedule,
  sendBookingReminder,
  sendWaitlistAvailable,
};
