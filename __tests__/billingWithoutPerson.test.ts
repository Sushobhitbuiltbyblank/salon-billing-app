import { describe, it, expect, beforeEach } from "vitest";
import { Storage, initStorage } from "@/lib/storage";
import { Invoice, InvoiceItem, Staff, SalonSettings } from "@/types";
import { calculateInvoiceTotals, calculateStaffPerformance } from "@/lib/calculations";
import { generateWhatsAppMessageText } from "@/lib/utils";
import { isAnonymousCustomerName } from "@/lib/customerUtils";

// Mock localStorage for Node test environment
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

const dummySettings: SalonSettings = {
  id: "settings-1",
  salon_name: "Belezia Salon Laxmi Nagar",
  tagline: "Beauty & Beyond",
  address: "F-10, Main Road, Laxmi Nagar, Delhi",
  phone: "9876543210",
  email: "info@belezia.in",
  gst_number: "07AAAAA0000A1Z5",
  currency_symbol: "₹",
  currency_code: "INR",
  upi_id: "belezia@upi",
  google_review_url: "https://g.page/review",
  instagram_url: "https://instagram.com/beleziasalon",
  thermal_width: "80mm",
  tax_rate: 18,
  tax_enabled: false,
  invoice_prefix: "BZ",
};

const staffList: Staff[] = [
  {
    id: "staff-1",
    name: "Aamir",
    role: "Senior Stylist",
    commission_rate: 15,
    status: "active",
  },
  {
    id: "staff-2",
    name: "Subhaan",
    role: "Stylist",
    commission_rate: 10,
    status: "active",
  },
];

describe("Billing Without Person Selection", () => {
  beforeEach(() => {
    localStorage.clear();
    initStorage();
  });

  it("1. Successfully creates and saves an invoice when no person/guest is picked or selected", () => {
    const itemsWithoutPerson: InvoiceItem[] = [
      {
        id: "item-svc-1",
        item_id: "cat-svc-1",
        item_name: "Hair Cut & Styling",
        item_type: "service",
        quantity: 1,
        unit_price: 500,
        discount: 0,
        total_price: 500,
        primary_staff_id: "staff-1",
        // guest_name is undefined (no person selected)
      },
      {
        id: "item-prod-1",
        item_id: "cat-prod-1",
        item_name: "Moroccanoil Treatment 100ml",
        item_type: "product",
        quantity: 1,
        unit_price: 2500,
        discount: 200,
        total_price: 2300,
        primary_staff_id: "staff-2",
        // guest_name is undefined (no person selected)
      },
    ];

    const invoice: Invoice = {
      id: "inv-no-person-001",
      invoice_number: "BZ-101",
      customer_name: "Walk-in Guest",
      customer_phone: "",
      customer_gender: "female",
      subtotal: 2800,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 2800,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: itemsWithoutPerson,
    };

    // Save invoice to storage
    const saved = Storage.createInvoice(invoice);
    expect(saved).toBeDefined();
    expect(saved.id).toBe("inv-no-person-001");

    // Verify it is stored and retrievable
    const storedInvoices = Storage.getInvoices();
    const found = storedInvoices.find((inv) => inv.id === "inv-no-person-001");
    expect(found).toBeDefined();
    expect(found?.items.length).toBe(2);
    expect(found?.items[0].item_name).toBe("Hair Cut & Styling");
    expect(found?.items[0].guest_name).toBeUndefined();
    expect(found?.items[1].item_name).toBe("Moroccanoil Treatment 100ml");
    expect(found?.items[1].guest_name).toBeUndefined();
    expect(found?.grand_total).toBe(2800);
  });

  it("2. Successfully creates and saves an invoice for a package combo without person selection", () => {
    const packageItemWithoutPerson: InvoiceItem = {
      id: "item-pkg-1",
      item_id: "cat-pkg-1",
      item_name: "Bridal Glow Combo",
      item_type: "package",
      quantity: 1,
      unit_price: 3500,
      discount: 500,
      total_price: 3000,
      package_services: [
        {
          service_id: "svc-facial",
          service_name: "O3+ Bridal Facial",
          price: 2000,
          regular_price: 2000,
          primary_staff_id: "staff-1",
          // guest_name is undefined
        },
        {
          service_id: "svc-pedi",
          service_name: "Crystal Spa Pedicure",
          price: 1500,
          regular_price: 1500,
          primary_staff_id: "staff-2",
          // guest_name is undefined
        },
      ],
    };

    const invoice: Invoice = {
      id: "inv-pkg-no-person",
      invoice_number: "BZ-102",
      customer_name: "Neha Verma",
      customer_phone: "9988776655",
      customer_gender: "female",
      subtotal: 3000,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 3000,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [packageItemWithoutPerson],
    };

    const saved = Storage.createInvoice(invoice);
    expect(saved).toBeDefined();

    const stored = Storage.getInvoices().find((i) => i.id === "inv-pkg-no-person");
    expect(stored).toBeDefined();
    expect(stored?.items[0].guest_name).toBeUndefined();
    expect(stored?.items[0].package_services?.length).toBe(2);
    expect(stored?.items[0].package_services?.[0].guest_name).toBeUndefined();
    expect(stored?.items[0].package_services?.[1].guest_name).toBeUndefined();
  });

  it("3. Handles mixed bills where some items have a person selected and others do not", () => {
    const mixedItems: InvoiceItem[] = [
      {
        id: "item-1",
        item_name: "Hydra Facial",
        item_type: "service",
        quantity: 1,
        unit_price: 1500,
        discount: 0,
        total_price: 1500,
        primary_staff_id: "staff-1",
        guest_name: "Pooja (Friend)", // Assigned to a specific companion
      },
      {
        id: "item-2",
        item_name: "Hair Spa",
        item_type: "service",
        quantity: 1,
        unit_price: 800,
        discount: 0,
        total_price: 800,
        primary_staff_id: "staff-2",
        // guest_name is undefined (not assigned to companion, belongs to main customer)
      },
    ];

    const invoice: Invoice = {
      id: "inv-mixed-003",
      invoice_number: "BZ-103",
      customer_name: "Simran",
      customer_phone: "9123456780",
      customer_gender: "female",
      subtotal: 2300,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 2300,
      payment_mode: "card",
      status: "paid",
      created_at: new Date().toISOString(),
      items: mixedItems,
    };

    Storage.createInvoice(invoice);

    const stored = Storage.getInvoices().find((i) => i.id === "inv-mixed-003");
    expect(stored).toBeDefined();
    expect(stored?.items[0].guest_name).toBe("Pooja (Friend)");
    expect(stored?.items[1].guest_name).toBeUndefined();
  });

  it("4. Correctly allows clearing a previously assigned person before saving", () => {
    const item: InvoiceItem = {
      id: "item-cleared",
      item_name: "Threading & Upper Lip",
      item_type: "service",
      quantity: 1,
      unit_price: 100,
      discount: 0,
      total_price: 100,
      primary_staff_id: "staff-1",
      guest_name: "Temporary Name",
    };

    // Simulate clearing person in cart
    const updatedItem: InvoiceItem = {
      ...item,
      guest_name: undefined,
      guest_gender: undefined,
      guest_phone: undefined,
    };

    expect(updatedItem.guest_name).toBeUndefined();

    const invoice: Invoice = {
      id: "inv-cleared-person",
      invoice_number: "BZ-104",
      customer_name: "Walk-in Guest",
      customer_gender: "female",
      subtotal: 100,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 100,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [updatedItem],
    };

    Storage.createInvoice(invoice);
    const stored = Storage.getInvoices().find((i) => i.id === "inv-cleared-person");
    expect(stored?.items[0].guest_name).toBeUndefined();
  });

  it("5. Simulates Supabase serialization and deserialization without person selection", () => {
    const items: InvoiceItem[] = [
      {
        id: "e4444444-4444-4444-4444-444444444401",
        item_id: "c1111111-1111-1111-1111-111111111101",
        item_name: "Beard Trim & Shape",
        item_type: "service",
        quantity: 1,
        unit_price: 200,
        discount: 0,
        total_price: 200,
        primary_staff_id: "11111111-1111-1111-1111-111111111101",
        // No guest_name
      },
    ];

    const invoice: Invoice = {
      id: "d3333333-3333-3333-3333-333333333301",
      invoice_number: "BZ-105",
      customer_name: "Karan Johar",
      customer_phone: "9876543210",
      customer_gender: "male",
      subtotal: 200,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 200,
      payment_mode: "cash",
      status: "paid",
      notes: "Quick touch-up",
      created_at: new Date().toISOString(),
      items,
    };

    // Serialize as notesPayload in SupabaseSync.createInvoice
    const notesPayload = JSON.stringify({
      user_notes: invoice.notes || "",
      items_meta: invoice.items,
    });

    const simulatedPgRow = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      subtotal: invoice.subtotal,
      grand_total: invoice.grand_total,
      notes: notesPayload,
      invoice_items: items.map((it) => ({
        id: it.id,
        item_name: it.item_name,
        item_type: it.item_type,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: it.discount,
        total_price: it.total_price,
        primary_staff_id: it.primary_staff_id,
      })),
    };

    // Deserialize as in SupabaseSync.loadAllData
    const parsedNotes = JSON.parse(simulatedPgRow.notes);
    const decodedItems: InvoiceItem[] = parsedNotes.items_meta || simulatedPgRow.invoice_items;

    expect(decodedItems.length).toBe(1);
    expect(decodedItems[0].item_name).toBe("Beard Trim & Shape");
    expect(decodedItems[0].guest_name).toBeUndefined();
    expect(parsedNotes.user_notes).toBe("Quick touch-up");
  });

  it("6. Generates WhatsApp message cleanly when no person is selected", () => {
    const invoice: Invoice = {
      id: "inv-whatsapp-test",
      invoice_number: "BZ-106",
      customer_name: "Walk-in Guest",
      customer_phone: "9876543210",
      customer_gender: "female",
      subtotal: 700,
      discount_amount: 100,
      discount_type: "flat",
      discount_value: 100,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 600,
      payment_mode: "cash",
      status: "paid",
      created_at: "2026-08-27T10:00:00.000Z",
      items: [
        {
          id: "it-1",
          item_name: "Hair Cut",
          item_type: "service",
          quantity: 1,
          unit_price: 700,
          discount: 100,
          total_price: 600,
        },
      ],
    };

    const { text, receiptUrl } = generateWhatsAppMessageText(invoice, dummySettings);

    expect(text).toContain("TAX INVOICE: BZ-106");
    expect(text).toContain("1. *Hair Cut* (1x) - ₹600.00");
    expect(text).not.toContain("👤 *"); // No per-person header when person is not selected
    expect(receiptUrl).toContain("/receipt/BZ-106");
  });

  it("7. Computes staff commissions and performance properly when billing without person selection", () => {
    const invoice: Invoice = {
      id: "inv-comm-test",
      invoice_number: "BZ-107",
      customer_name: "Walk-in Guest",
      subtotal: 1000,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 1000,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "it-1",
          item_name: "Global Hair Color",
          item_type: "service",
          quantity: 1,
          unit_price: 1000,
          discount: 0,
          total_price: 1000,
          primary_staff_id: "staff-1", // Aamir (15%)
          // guest_name is undefined
        },
      ],
    };

    const summaries = calculateStaffPerformance([invoice], staffList);
    const aamirSummary = summaries.find((s) => s.staff.id === "staff-1");

    expect(aamirSummary).toBeDefined();
    expect(aamirSummary?.total_sales_generated).toBe(1000);
    expect(aamirSummary?.total_commission_earned).toBe(150); // 15% of 1000
    expect(aamirSummary?.services_count).toBe(1);
  });

  it("8. Allows updating/editing an existing invoice without requiring person tags", () => {
    const originalInvoice: Invoice = {
      id: "inv-edit-001",
      invoice_number: "BZ-108",
      customer_name: "Anita",
      customer_phone: "9811122233",
      customer_gender: "female",
      subtotal: 500,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 500,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "it-edit-1",
          item_name: "Blowdry",
          item_type: "service",
          quantity: 1,
          unit_price: 500,
          discount: 0,
          total_price: 500,
          primary_staff_id: "staff-1",
        },
      ],
    };

    Storage.createInvoice(originalInvoice);

    // Update with an added item (also without person tag)
    const updatedInvoice: Invoice = {
      ...originalInvoice,
      subtotal: 800,
      grand_total: 800,
      items: [
        originalInvoice.items[0],
        {
          id: "it-edit-2",
          item_name: "Hair Wash",
          item_type: "service",
          quantity: 1,
          unit_price: 300,
          discount: 0,
          total_price: 300,
          primary_staff_id: "staff-2",
        },
      ],
    };

    const savedUpdated = Storage.updateInvoice(updatedInvoice);
    expect(savedUpdated.grand_total).toBe(800);
    expect(savedUpdated.items.length).toBe(2);
    expect(savedUpdated.items.every((it) => it.guest_name === undefined)).toBe(true);

    const reloaded = Storage.getInvoices().find((i) => i.id === "inv-edit-001");
    expect(reloaded?.grand_total).toBe(800);
    expect(reloaded?.items.length).toBe(2);
  });

  it("9. Correctly voids an invoice billed without person tags and adjusts stats", () => {
    const invoiceToVoid: Invoice = {
      id: "inv-void-001",
      invoice_number: "BZ-109",
      customer_name: "Pooja",
      customer_phone: "9876599999",
      customer_gender: "female",
      subtotal: 1200,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 1200,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "it-void-1",
          item_name: "Keratin Touchup",
          item_type: "service",
          quantity: 1,
          unit_price: 1200,
          discount: 0,
          total_price: 1200,
          primary_staff_id: "staff-1",
        },
      ],
    };

    Storage.createInvoice(invoiceToVoid);
    Storage.voidInvoice("inv-void-001");
    const voided = Storage.getInvoices().find((i) => i.id === "inv-void-001");
    expect(voided?.status).toBe("void");
    expect(voided?.items[0].guest_name).toBeUndefined();
  });

  it("10. Allows guest user billing without specifying gender (unspecified gender)", () => {
    const guestInvoice: Invoice = {
      id: "inv-guest-nogender-01",
      invoice_number: "BZ-110",
      customer_name: "Walk-in Guest",
      customer_phone: "",
      customer_gender: "unspecified",
      subtotal: 450,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 450,
      payment_mode: "cash",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "it-guest-1",
          item_name: "Beard Trim",
          item_type: "service",
          quantity: 1,
          unit_price: 450,
          discount: 0,
          total_price: 450,
          primary_staff_id: "staff-1",
        },
      ],
    };

    const saved = Storage.createInvoice(guestInvoice);
    expect(saved).toBeDefined();
    expect(saved.customer_gender).toBe("unspecified");

    const found = Storage.getInvoices().find((i) => i.id === "inv-guest-nogender-01");
    expect(found).toBeDefined();
    expect(found?.customer_name).toBe("Walk-in Guest");
    expect(found?.customer_gender).toBe("unspecified");
  });

  it("11. Validates hasNamedCustomer logic: treats anonymous / walk-in clients as guest where gender is optional", () => {
    expect(isAnonymousCustomerName("")).toBe(true);
    expect(isAnonymousCustomerName(null)).toBe(true);
    expect(isAnonymousCustomerName(undefined)).toBe(true);
    expect(isAnonymousCustomerName("Walk-in Guest")).toBe(true);
    expect(isAnonymousCustomerName("walk in")).toBe(true);
    expect(isAnonymousCustomerName("guest")).toBe(true);
    expect(isAnonymousCustomerName("Guest (9876543210)")).toBe(true);
    expect(isAnonymousCustomerName("Aditi Rao")).toBe(false);
    expect(isAnonymousCustomerName("Rahul Sharma")).toBe(false);
  });
});


