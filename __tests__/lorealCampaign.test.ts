import { describe, it, expect, beforeEach } from "vitest";
import {
  LOREAL_EVENT_TERMS,
  LOREAL_EVENT_TERMS_SHORT,
  SALON_BOOKING_WHATSAPP,
  SALON_BOOKING_WHATSAPP_CLEAN,
  cleanPhoneNumber,
  appendTermsAndConditions,
  formatSpinOfferCustomerConfirmationMessage,
  formatSpinOfferDispatchMessage,
  getSalonBookingWhatsAppUrl,
  getSpinOfferDispatchWhatsAppUrl,
  formatLorealSpinInviteWhatsAppMessage,
  getLorealSpinInviteWhatsAppUrl,
} from "@/lib/whatsapp";
import {
  generateOfferToken,
  getLocalSpinLogs,
  saveLocalSpinLog,
  isPhoneClaimedLocally,
  isTokenRedeemedLocally,
} from "@/lib/rewardStorage";
import { SupabaseSync } from "@/lib/supabaseSync";
import { generateWhatsAppMessageText } from "@/lib/utils";
import { SpinLog } from "@/types/rewards";
import { Invoice, SalonSettings } from "@/types";

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
global.localStorage = mockStorage as any;
(global as any).window = { localStorage: mockStorage };

describe("L'Oréal Professional Day Campaign & WhatsApp Integration", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("should have exact mandatory Terms & Conditions string specified by campaign", () => {
    expect(LOREAL_EVENT_TERMS).toBe(
      "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!"
    );
    expect(LOREAL_EVENT_TERMS_SHORT).toBe(
      "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!"
    );
  });

  it("should normalize Indian phone numbers to clean 10-digit format", () => {
    expect(cleanPhoneNumber("+91 72908 28680")).toBe("7290828680");
    expect(cleanPhoneNumber("+91-7290828680")).toBe("7290828680");
    expect(cleanPhoneNumber("917290828680")).toBe("7290828680");
    expect(cleanPhoneNumber("7290828680")).toBe("7290828680");
    expect(cleanPhoneNumber("9876543210")).toBe("9876543210");
  });

  it("should format customer WhatsApp confirmation message targeted to +91-7290828680 with exact terms", () => {
    const message = formatSpinOfferCustomerConfirmationMessage({
      customerName: "Riya Verma",
      customerPhone: "9876543210",
      wonItem: "Free L'Oréal Shampoo",
      offerId: "BZ-LOREAL-5501",
      eventDate: "Saturday, October 31, 2026",
      salonName: "Belezia Salon, Laxmi Nagar",
    });

    expect(message).toContain("Belezia Salon, Laxmi Nagar");
    expect(message).toContain("Riya Verma");
    expect(message).toContain("Free L'Oréal Shampoo");
    expect(message).toContain("BZ-LOREAL-5501");
    expect(message).toContain("Saturday, October 31, 2026");
    expect(message).toContain("Absolute Free L'Oréal Goodie Bag");
    expect(message).toContain("100% FREE");
    expect(message).toContain(
      "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!"
    );
  });

  it("should format salon WhatsApp dispatch message with exact terms and booking number", () => {
    const dispatch = formatSpinOfferDispatchMessage({
      customerName: "Aman Gupta",
      wonItem: "Free Hair Cut Service",
      offerId: "BZ-LOREAL-1234",
    });

    expect(dispatch).toContain("Aman Gupta");
    expect(dispatch).toContain("Free Hair Cut Service");
    expect(dispatch).toContain("BZ-LOREAL-1234");
    expect(dispatch).toContain("Saturday, October 31, 2026");
    expect(dispatch).toContain("Absolute Free L'Oréal Goodie Bag");
    expect(dispatch).toContain("100% FREE");
    expect(dispatch).toContain(
      "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!"
    );
  });

  it("should generate valid click-to-chat WhatsApp URL directed to +91-7290828680", () => {
    const url = getSalonBookingWhatsAppUrl({
      customerName: "Pooja Malhotra",
      customerPhone: "9811122233",
      wonItem: "Free Hair Spa",
      offerId: "BZ-LOREAL-9988",
    });

    expect(url).toContain(`https://wa.me/${SALON_BOOKING_WHATSAPP_CLEAN}?text=`);
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("Pooja Malhotra");
    expect(decoded).toContain("Free Hair Spa");
    expect(decoded).toContain("BZ-LOREAL-9988");
    expect(decoded).toContain(
      "First-Come, First-Served"
    );
  });

  it("should append terms & conditions if not already present in arbitrary message", () => {
    const original = "Hello from Belezia Salon!";
    const appended = appendTermsAndConditions(original);
    expect(appended).toContain(LOREAL_EVENT_TERMS);

    // Calling it again should not duplicate
    const twice = appendTermsAndConditions(appended);
    expect(twice.split(LOREAL_EVENT_TERMS).length - 1).toBe(1);
  });

  it("should enforce anti-fraud lockout: one offer per phone number", async () => {
    const testPhone = "9876543210";
    expect(isPhoneClaimedLocally(testPhone)).toBe(false);

    // Record a spin log for this phone
    const log: SpinLog = {
      id: "log-1",
      offer_token: "BZ-LOREAL-1001",
      customer_name: "Test User",
      phone_number: testPhone,
      won_item: "Free Hair Spa",
      is_redeemed: true,
      redeemed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    saveLocalSpinLog(log);

    expect(isPhoneClaimedLocally(testPhone)).toBe(true);
    expect(isPhoneClaimedLocally("+91 98765-43210")).toBe(true);

    const hasClaimed = await SupabaseSync.checkPhoneHasClaimed(testPhone);
    expect(hasClaimed).toBe(true);

    // Different phone number should not be locked out
    expect(isPhoneClaimedLocally("9123456780")).toBe(false);
  });

  it("should expire single-use offer links/tokens once redeemed", async () => {
    const testToken = "LOREAL-VIP-TOKEN-777";
    expect(isTokenRedeemedLocally(testToken)).toBe(false);

    const validation1 = await SupabaseSync.validateOfferToken(testToken);
    expect(validation1.isRedeemed).toBe(false);

    // Save redeemed spin log with this token
    const log: SpinLog = {
      id: "log-token-1",
      offer_token: testToken,
      customer_name: "Token User",
      phone_number: "9876500000",
      won_item: "Free L'Oréal Shampoo",
      is_redeemed: true,
      redeemed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    saveLocalSpinLog(log);

    expect(isTokenRedeemedLocally(testToken)).toBe(true);
    // Case-insensitive check
    expect(isTokenRedeemedLocally("loreal-vip-token-777")).toBe(true);

    const validation2 = await SupabaseSync.validateOfferToken(testToken);
    expect(validation2.isRedeemed).toBe(true);
  });

  it("should keep default tax invoice WhatsApp message text clean without any L'Oréal Day promotions", () => {
    const mockInvoice: Invoice = {
      id: "inv-1",
      invoice_number: "BZ-20261031-1001",
      customer_name: "Sneha Kapur",
      customer_phone: "9876543210",
      items: [
        {
          id: "item-1",
          item_name: "Hair Cut & Styling",
          item_type: "service",
          quantity: 1,
          unit_price: 1200,
          discount: 0,
          total_price: 1200,
        },
      ],
      subtotal: 1200,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_rate: 18,
      tax_amount: 216,
      grand_total: 1416,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
    };

    const mockSettings: SalonSettings = {
      id: "set-1",
      salon_name: "Belezia Luxury Salon",
      tagline: "Unisex Salon & Spa",
      address: "Shop 14-16, Laxmi Nagar, Delhi",
      phone: "+91-7290828680",
      email: "contact@belezia.com",
      gst_number: "07AAAAA0000A1Z5",
      currency_symbol: "₹",
      currency_code: "INR",
      upi_id: "belezia@upi",
      google_review_url: "https://g.page/review",
      instagram_url: "https://instagram.com/belezia",
      thermal_width: "80mm",
      tax_rate: 18,
      tax_enabled: true,
      invoice_prefix: "BZ",
    };

    const { text, receiptUrl } = generateWhatsAppMessageText(mockInvoice, mockSettings);

    // Default invoice must be clean and not contain any L'Oreal promotion details
    expect(text).not.toContain("L'ORÉAL PROFESSIONAL DAY");
    expect(text).not.toContain("Only first 50 customers can reveal the offer");
    expect(text).not.toContain("/spin");

    // Standard receipt contents are preserved
    expect(text).toContain("TAX INVOICE: BZ-20261031-1001");
    expect(text).toContain("Sneha Kapur");
    expect(text).toContain("DOWNLOAD ORIGINAL BILL (PDF/IMAGE)");
    expect(text).toContain(receiptUrl);
  });

  it("should format separate L'Oréal Day Spin-the-Wheel WhatsApp invitation with link, details, and exact terms", () => {
    const message = formatLorealSpinInviteWhatsAppMessage({
      customerName: "Sneha Kapur",
      customerPhone: "9876543210",
      baseUrl: "https://belezia-salon-billing-app.vercel.app",
    });

    expect(message).toContain("BELEZIA SALON × L’ORÉAL PROFESSIONNEL");
    expect(message).toContain("Sneha Kapur");
    expect(message).toContain("Saturday, October 31, 2026");
    expect(message).toContain("Belezia Salon, Laxmi Nagar");
    expect(message).toContain("Absolute Free L'Oréal Goodie Bag");
    expect(message).toContain("Professional scalp & damage micro-analysis");
    expect(message).toContain("+91-7290828680");
    expect(message).toContain(
      "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!"
    );
    expect(message).toContain("https://belezia-salon-billing-app.vercel.app/spin?name=Sneha+Kapur&phone=9876543210");
  });

  it("should generate direct wa.me link for separate L'Oréal Spin Wheel invitation to customer's WhatsApp", () => {
    const url = getLorealSpinInviteWhatsAppUrl({
      customerName: "Sneha Kapur",
      customerPhone: "+91 98765-43210",
      baseUrl: "https://belezia-salon-billing-app.vercel.app",
    });

    expect(url).toContain("https://wa.me/919876543210?text=");
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("BELEZIA SALON × L’ORÉAL PROFESSIONNEL");
    expect(decoded).toContain("First-Come, First-Served");
    expect(decoded).toContain("/spin");
  });

  it("should verify valid offer by Unique Offer ID and return complete details", async () => {
    const testOfferId = "BZ-LOREAL-8899";
    const log: SpinLog = {
      id: "log-verify-1",
      offer_token: testOfferId,
      customer_name: "Kavita Mehra",
      phone_number: "9876512345",
      won_item: "Free Hair Cut Service",
      is_redeemed: true,
      redeemed_at: "2026-10-31T10:30:00Z",
      created_at: "2026-10-31T10:30:00Z",
    };
    saveLocalSpinLog(log);

    const result = await SupabaseSync.verifyOfferById(testOfferId);
    expect(result.isValid).toBe(true);
    expect(result.offerDetails).toBeDefined();
    expect(result.offerDetails?.offerToken).toBe(testOfferId);
    expect(result.offerDetails?.customerName).toBe("Kavita Mehra");
    expect(result.offerDetails?.phoneNumber).toBe("9876512345");
    expect(result.offerDetails?.wonItem).toBe("Free Hair Cut Service");
    expect(result.offerDetails?.eventDate).toBe("Saturday, October 31, 2026");
    expect(result.offerDetails?.venue).toBe("Belezia Salon, Laxmi Nagar");
    expect(result.offerDetails?.terms).toContain("First-Come, First-Served");
  });

  it("should return invalid status and error message when verifying unrecognized Offer ID", async () => {
    const invalidResult = await SupabaseSync.verifyOfferById("BZ-UNKNOWN-9999");
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.offerDetails).toBeUndefined();
    expect(invalidResult.error).toContain('No offer record found matching Unique ID "BZ-UNKNOWN-9999"');

    const emptyResult = await SupabaseSync.verifyOfferById("   ");
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.error).toBe("Please enter an Offer ID to verify.");
  });

  it("should verify that L'Oréal Day event text and disclaimer are present in invitation messages", () => {
    const invite = formatLorealSpinInviteWhatsAppMessage({
      customerName: "Pooja",
      customerPhone: "9876543210",
      baseUrl: "https://belezia-salon-billing-app.vercel.app",
    });

    expect(invite).toContain("Belezia Salon is partnering with L’Oréal Professionnel");
    expect(invite).toContain("Hair Consultation Event with visiting corporate experts!");
    expect(invite).toContain("Absolute Free L'Oréal Goodie Bag!");
    expect(invite).toContain("Professional scalp & damage micro-analysis");
    expect(invite).toContain("Personalized hair contouring & color mapping");
    expect(invite).toContain("A customized routine mapped out by certified L'Oréal Experts");
    expect(invite).toContain("Saturday, October 31, 2026");
    expect(invite).toContain("Belezia Salon, Laxmi Nagar");
    expect(invite).toContain("100% FREE");
    expect(invite).toContain(
      "🚨 Disclaimer: This exclusive offer and the free goodies are valid strictly on 31 October on a First-Come, First-Served basis, only till stocks last! Doors open at 10:00 AM sharp—make sure to arrive early so you don't miss out!"
    );
  });
});

