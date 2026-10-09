/**
 * JavaScript wrapper & re-export for whatsapp utility functions.
 * Required for Technical Specification compatibility (whatsapp.js).
 */

export * from "./whatsapp.ts";
export {
  LOREAL_EVENT_TERMS,
  LOREAL_EVENT_TERMS_SHORT,
  SALON_BOOKING_WHATSAPP,
  SALON_BOOKING_WHATSAPP_CLEAN,
  SALON_EVENT_NAME,
  SALON_EVENT_VENUE,
  SALON_EVENT_DATE,
  cleanPhoneNumber,
  appendTermsAndConditions,
  formatSpinOfferCustomerConfirmationMessage,
  formatSpinOfferDispatchMessage,
  getSalonBookingWhatsAppUrl,
  getSpinOfferDispatchWhatsAppUrl,
  formatLorealSpinInviteWhatsAppMessage,
  getLorealSpinInviteWhatsAppUrl,
} from "./whatsapp.ts";

