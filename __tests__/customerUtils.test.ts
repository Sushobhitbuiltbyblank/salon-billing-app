import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  normalizeCustomerName,
  isAnonymousCustomerName,
  deduplicateCustomerArray,
  unifyCustomerList,
} from "@/lib/customerUtils";
import { Customer, Invoice } from "@/types";

describe("Customer CRM & Phone Normalization Utils", () => {
  describe("normalizePhoneNumber", () => {
    it("cleans standard 10-digit Indian numbers", () => {
      expect(normalizePhoneNumber("9876543210")).toBe("9876543210");
      expect(normalizePhoneNumber(" 98765 43210 ")).toBe("9876543210");
      expect(normalizePhoneNumber("98765-43210")).toBe("9876543210");
    });

    it("strips country code +91 or 0 prefix", () => {
      expect(normalizePhoneNumber("+919876543210")).toBe("9876543210");
      expect(normalizePhoneNumber("+91 9876543210")).toBe("9876543210");
      expect(normalizePhoneNumber("09876543210")).toBe("9876543210");
      expect(normalizePhoneNumber("919876543210")).toBe("9876543210");
    });

    it("returns digits for non-standard or short numbers without failing", () => {
      expect(normalizePhoneNumber("12345")).toBe("12345");
      expect(normalizePhoneNumber("")).toBe("");
      expect(normalizePhoneNumber(undefined)).toBe("");
    });
  });

  describe("isAnonymousCustomerName", () => {
    it("identifies anonymous / placeholder guest names", () => {
      expect(isAnonymousCustomerName("Walk-in Guest")).toBe(true);
      expect(isAnonymousCustomerName("Guest")).toBe(true);
      expect(isAnonymousCustomerName("Walk-in")).toBe(true);
      expect(isAnonymousCustomerName("Guest (9876543210)")).toBe(true);
      expect(isAnonymousCustomerName("Walkin")).toBe(true);
      expect(isAnonymousCustomerName("")).toBe(true);
    });

    it("recognizes named customers", () => {
      expect(isAnonymousCustomerName("Mohit")).toBe(false);
      expect(isAnonymousCustomerName("Vishakha Sharma")).toBe(false);
      expect(isAnonymousCustomerName("Amit Kumar")).toBe(false);
    });
  });

  describe("deduplicateCustomerArray", () => {
    it("deduplicates customers strictly by phone number and preserves gender", () => {
      const input: Customer[] = [
        {
          id: "cust-1",
          name: "Mohit",
          phone: "8168584831",
          gender: "male",
          total_visits: 2,
          total_spent: 500,
        },
        {
          id: "cust-2",
          name: "Mohit Kumar",
          phone: "+91 8168584831",
          gender: "male",
          total_visits: 1,
          total_spent: 250,
        },
      ];

      const deduplicated = deduplicateCustomerArray(input);
      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].phone).toBe("8168584831");
      expect(deduplicated[0].gender).toBe("male");
      expect(deduplicated[0].total_visits).toBe(2);
      expect(deduplicated[0].total_spent).toBe(500);
    });

    it("does not overwrite specific gender with unspecified", () => {
      const input: Customer[] = [
        {
          id: "cust-1",
          name: "Vishakha",
          phone: "9958872996",
          gender: "female",
          total_visits: 1,
          total_spent: 200,
        },
        {
          id: "cust-2",
          name: "Vishakha",
          phone: "9958872996",
          gender: "unspecified",
          total_visits: 1,
          total_spent: 200,
        },
      ];

      const deduplicated = deduplicateCustomerArray(input);
      expect(deduplicated.length).toBe(1);
      expect(deduplicated[0].gender).toBe("female");
    });
  });

  describe("unifyCustomerList", () => {
    it("combines registered customers with invoice history", () => {
      const registered: Customer[] = [
        {
          id: "cust-mohit",
          name: "Mohit",
          phone: "8168584831",
          gender: "male",
          total_visits: 0,
          total_spent: 0,
        },
      ];

      const invoices: Invoice[] = [
        {
          id: "inv-1",
          invoice_number: "BZ-1001",
          customer_id: "cust-mohit",
          customer_name: "Mohit",
          customer_phone: "8168584831",
          customer_gender: "male",
          subtotal: 250,
          discount_amount: 0,
          discount_type: "flat",
          discount_value: 0,
          tax_amount: 0,
          tax_rate: 0,
          grand_total: 250,
          payment_mode: "cash",
          status: "paid",
          created_at: "2026-08-26T10:00:00Z",
          items: [],
        },
      ];

      const unified = unifyCustomerList(registered, invoices);
      expect(unified.length).toBe(1);
      expect(unified[0].name).toBe("Mohit");
      expect(unified[0].gender).toBe("male");
      expect(unified[0].total_visits).toBe(1);
      expect(unified[0].total_spent).toBe(250);
    });

    it("discovers unregistered clients from invoices and calculates visits & spend", () => {
      const registered: Customer[] = [];

      const invoices: Invoice[] = [
        {
          id: "inv-1",
          invoice_number: "BZ-1001",
          customer_name: "Rohan",
          customer_phone: "9811122233",
          customer_gender: "male",
          subtotal: 500,
          discount_amount: 0,
          discount_type: "flat",
          discount_value: 0,
          tax_amount: 0,
          tax_rate: 0,
          grand_total: 500,
          payment_mode: "upi",
          status: "paid",
          created_at: "2026-08-20T10:00:00Z",
          items: [],
        },
        {
          id: "inv-2",
          invoice_number: "BZ-1002",
          customer_name: "Rohan",
          customer_phone: "+91 9811122233",
          customer_gender: "male",
          subtotal: 300,
          discount_amount: 0,
          discount_type: "flat",
          discount_value: 0,
          tax_amount: 0,
          tax_rate: 0,
          grand_total: 300,
          payment_mode: "cash",
          status: "paid",
          created_at: "2026-08-26T10:00:00Z",
          items: [],
        },
      ];

      const unified = unifyCustomerList(registered, invoices);
      expect(unified.length).toBe(1);
      expect(unified[0].name).toBe("Rohan");
      expect(unified[0].phone).toBe("9811122233");
      expect(unified[0].gender).toBe("male");
      expect(unified[0].total_visits).toBe(2);
      expect(unified[0].total_spent).toBe(800);
    });
  });
});
