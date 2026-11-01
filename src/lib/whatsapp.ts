/**
 * WhatsApp Utility for L'Oréal Professional Day Campaign & Belezia Salon
 * Standardizes message templates, click-to-chat links, and embeds required Terms & Conditions.
 */

export const LOREAL_EVENT_TERMS =
  "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!";

export const LOREAL_EVENT_TERMS_SHORT =
  "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!";

export const SALON_BOOKING_WHATSAPP = "+91-7290828680";
export const SALON_BOOKING_WHATSAPP_CLEAN = "917290828680";
export const SALON_EVENT_NAME = "L’Oréal Professionnel Hair Consultation Event";
export const SALON_EVENT_VENUE = "Belezia Salon, Laxmi Nagar";
export const SALON_EVENT_DATE = "Saturday, October 31, 2026";

export interface SpinOfferMessageParams {
  customerName?: string;
  customerPhone?: string;
  wonItem: string;
  offerId: string;
  eventDate?: string;
  salonName?: string;
  salonPhone?: string;
}

/**
 * Normalizes phone number into 10-digit format without country code or symbols
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Appends the mandatory terms & conditions to any message text if not already present
 */
export function appendTermsAndConditions(message: string): string {
  if (
    message.includes("First-Come, First-Served") ||
    message.includes(LOREAL_EVENT_TERMS)
  ) {
    return message;
  }
  return `${message.trim()}\n\n*${LOREAL_EVENT_TERMS}*`;
}

/**
 * Standard WhatsApp message sent by the customer to +91-7290828680 to confirm booking
 */
export function formatSpinOfferCustomerConfirmationMessage({
  customerName,
  customerPhone,
  wonItem,
  offerId,
  eventDate = SALON_EVENT_DATE,
  salonName = SALON_EVENT_VENUE,
}: SpinOfferMessageParams): string {
  const nameDisplay = customerName?.trim() ? `*${customerName.trim()}*` : "Customer";
  const phoneDisplay = customerPhone ? cleanPhoneNumber(customerPhone) : "";

  return (
    `🌟 *BELEZIA SALON × L’ORÉAL PROFESSIONNEL* 🌟\n` +
    `*Hair Consultation Event — Offer Confirmation*\n\n` +
    `Hello Belezia Salon! ✨ I won an exclusive reward on the Spin-the-Wheel for the L'Oréal Hair Consultation Event:\n\n` +
    `👤 *Customer Name:* ${nameDisplay}\n` +
    (phoneDisplay ? `📱 *Phone:* +91 ${phoneDisplay}\n` : "") +
    `🎁 *Won Reward:* *${wonItem}*\n` +
    `🎟️ *Unique Offer ID:* *${offerId}*\n` +
    `🎁 *Entry Bonus:* Absolute Free L'Oréal Goodie Bag\n` +
    `📅 *Date:* ${eventDate}\n` +
    `📍 *Location:* ${salonName}\n` +
    `💰 *Entry & Consult:* 100% FREE\n\n` +
    `${LOREAL_EVENT_TERMS}\n\n` +
    `Looking forward to visiting Belezia Salon on Saturday, October 31! 💇‍♀️💅`
  );
}

/**
 * Standard WhatsApp message dispatched to customer from salon or share button
 */
export function formatSpinOfferDispatchMessage({
  customerName,
  wonItem,
  offerId,
  eventDate = SALON_EVENT_DATE,
  salonName = SALON_EVENT_VENUE,
  salonPhone = SALON_BOOKING_WHATSAPP,
}: SpinOfferMessageParams): string {
  const nameDisplay = customerName?.trim() ? `*${customerName.trim()}*` : "Valued Customer";

  return (
    `🎉 *BELEZIA SALON × L’ORÉAL PROFESSIONNEL* 🎉\n` +
    `*Exclusive Hair Consultation Event — VIP Pass*\n\n` +
    `Dear ${nameDisplay},\n` +
    `You have revealed a special reward on our Lucky Spin Wheel for our exclusive consultation day with visiting L'Oréal corporate experts!\n\n` +
    `🎁 *Won Item:* *${wonItem}*\n` +
    `🎟️ *Unique Offer ID:* *${offerId}*\n` +
    `🎁 *Entry Bonus:* Absolute Free L'Oréal Goodie Bag for every consultation!\n` +
    `📅 *Date:* ${eventDate}\n` +
    `📍 *Location:* ${salonName}\n` +
    `💰 *Entry & Consult:* 100% FREE\n` +
    `📞 *WhatsApp Assistance:* ${salonPhone}\n\n` +
    `${LOREAL_EVENT_TERMS}\n\n` +
    `📲 *Next Step:* Save or screenshot your voucher and present your Offer ID when you arrive! Doors open at 10:00 AM sharp. See you at Belezia Salon! ✨`
  );
}

/**
 * Generates direct wa.me link to salon's booking number (+91-7290828680)
 * containing customer confirmation text and terms.
 */
export function getSalonBookingWhatsAppUrl(params: SpinOfferMessageParams): string {
  const message = formatSpinOfferCustomerConfirmationMessage(params);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${SALON_BOOKING_WHATSAPP_CLEAN}?text=${encoded}`;
}

/**
 * Generates wa.me link for dispatching the offer (either to customer's phone or universal share)
 */
export function getSpinOfferDispatchWhatsAppUrl(
  params: SpinOfferMessageParams,
  targetPhone?: string
): string {
  const message = formatSpinOfferDispatchMessage(params);
  const encoded = encodeURIComponent(message);

  const clean = cleanPhoneNumber(targetPhone);
  if (clean && clean.length === 10) {
    return `https://wa.me/91${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export interface LorealSpinInviteParams {
  customerName?: string;
  customerPhone?: string;
  baseUrl?: string;
  salonName?: string;
  salonVenue?: string;
  eventDate?: string;
  salonPhone?: string;
}

export const CUSTOMER_OFFERS_BASE_URL = "https://belezia-offers.vercel.app";
export const CUSTOMER_OFFERS_SPIN_URL = "https://belezia-offers.vercel.app/spin";

/**
 * Standard WhatsApp message sent to customer thanking them for the L'Oréal Day event
 * and inviting them to follow on Instagram for future event updates.
 */
export function formatLorealSpinInviteWhatsAppMessage({
  customerName,
  customerPhone,
  baseUrl = CUSTOMER_OFFERS_BASE_URL,
  salonName = "Belezia Salon",
  salonVenue = SALON_EVENT_VENUE,
  salonPhone = SALON_BOOKING_WHATSAPP,
}: LorealSpinInviteParams = {}): string {
  const nameDisplay = customerName?.trim() ? `*${customerName.trim()}*` : "Valued Customer";
  const cleanPhone = cleanPhoneNumber(customerPhone);

  const queryParams = new URLSearchParams();
  if (customerName?.trim()) queryParams.set("name", customerName.trim());
  if (cleanPhone) queryParams.set("phone", cleanPhone);
  const paramString = queryParams.toString();
  const offersUrl = `${baseUrl.replace(/\/$/, "")}/${paramString ? `?${paramString}` : ""}`;

  return (
    `✨ *BELEZIA SALON × L’ORÉAL PROFESSIONNEL* ✨\n` +
    `*The Event Was Great! Thank You For Making It a Grand Success!* 🎉\n\n` +
    `Dear ${nameDisplay},\n\n` +
    `A huge, heartfelt thank you from all of us at *${salonName}* for celebrating our *L'Oréal Professionnel Hair Consultation & Lucky Wheel Event* with us! Thanks to your incredible love and enthusiasm, the event was a massive success.\n\n` +
    `🚀 *More Exciting Events Coming Soon!*\n` +
    `Missed this one or want more? We will launch more such exciting beauty events, expert hair consultations, and lucky wheel giveaways in the future.\n\n` +
    `📸 *Please follow us on Instagram for all future event updates & exclusive offers:*\n` +
    `👉 https://www.instagram.com/beleziasalonlaxminagar/\n\n` +
    `🔗 *Event Page & Updates:*\n` +
    `👉 ${offersUrl}\n\n` +
    `📍 *Location:* ${salonVenue}\n` +
    `📞 *WhatsApp & Assistance:* ${salonPhone}\n\n` +
    `We look forward to welcoming you back to the salon soon!\n— *${salonName} Team* 💇‍♀️✨`
  );
}

/**
 * Generates direct wa.me link to send the L'Oréal Spin Wheel invitation directly to customer's WhatsApp
 */
export function getLorealSpinInviteWhatsAppUrl(params: LorealSpinInviteParams = {}): string {
  const message = formatLorealSpinInviteWhatsAppMessage(params);
  const encoded = encodeURIComponent(message);
  const clean = cleanPhoneNumber(params.customerPhone);
  if (clean && clean.length === 10) {
    return `https://wa.me/91${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

