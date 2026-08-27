import { describe, it, expect } from "vitest";
import {
  detectCustomerReminders,
  generateWhatsAppReminderUrl,
  generateWhatsAppRakhiOfferUrl,
  isGroomingOrShaveService,
  wasReminderSentToday,
} from "@/lib/reminderUtils";
import { Customer, Invoice } from "@/types";

describe("Customer Reminder Engine & WhatsApp Trigger", () => {
  it("identifies grooming / shave services correctly", () => {
    expect(isGroomingOrShaveService("Shave")).toBe(true);
    expect(isGroomingOrShaveService("Beard Trim")).toBe(true);
    expect(isGroomingOrShaveService("Beard Styling")).toBe(true);
    expect(isGroomingOrShaveService("Clean Shave")).toBe(true);
    expect(isGroomingOrShaveService("Hair Cut")).toBe(false);
    expect(isGroomingOrShaveService("Facial")).toBe(false);
  });

  it("detects overdue customers for Shaving (>= 7 days)", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const customer: Customer = {
      id: "cust-1",
      name: "Amit",
      phone: "9876543210",
      gender: "male",
      total_visits: 1,
      total_spent: 100,
      last_visit: eightDaysAgo,
    };

    const invoice: Invoice = {
      id: "inv-1",
      invoice_number: "BZ-1001",
      customer_id: "cust-1",
      customer_name: "Amit",
      customer_phone: "9876543210",
      subtotal: 100,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 100,
      payment_mode: "cash",
      status: "paid",
      created_at: eightDaysAgo,
      items: [
        {
          id: "it-1",
          item_name: "Beard Shave",
          item_type: "service",
          quantity: 1,
          unit_price: 100,
          discount: 0,
          total_price: 100,
        },
      ],
    };

    const reminders = detectCustomerReminders([customer], [invoice]);
    expect(reminders.length).toBe(1);
    expect(reminders[0].serviceType).toBe("grooming_shave");
    expect(reminders[0].intervalDays).toBe(7);
    expect(reminders[0].isOverdue).toBe(true);
    expect(reminders[0].overdueDays).toBe(1); // 8 - 7 = 1
  });

  it("detects overdue customers for Haircut / Spa (>= 30 days)", () => {
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();

    const customer: Customer = {
      id: "cust-2",
      name: "Neha",
      phone: "9876543211",
      gender: "female",
      total_visits: 1,
      total_spent: 600,
      last_visit: thirtyFiveDaysAgo,
    };

    const invoice: Invoice = {
      id: "inv-2",
      invoice_number: "BZ-1002",
      customer_id: "cust-2",
      customer_name: "Neha",
      customer_phone: "9876543211",
      subtotal: 600,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 600,
      payment_mode: "upi",
      status: "paid",
      created_at: thirtyFiveDaysAgo,
      items: [
        {
          id: "it-2",
          item_name: "Hair Spa",
          item_type: "service",
          quantity: 1,
          unit_price: 600,
          discount: 0,
          total_price: 600,
        },
      ],
    };

    const reminders = detectCustomerReminders([customer], [invoice]);
    expect(reminders.length).toBe(1);
    expect(reminders[0].serviceType).toBe("haircut_spa");
    expect(reminders[0].intervalDays).toBe(30);
    expect(reminders[0].isOverdue).toBe(true);
    expect(reminders[0].overdueDays).toBe(5); // 35 - 30 = 5
  });

  it("generates a clean WhatsApp reminder URL with personalized message", () => {
    const customer: Customer = {
      id: "cust-3",
      name: "Mohit",
      phone: "8168584831",
      gender: "male",
      total_visits: 1,
      total_spent: 250,
    };

    const reminderInfo = {
      customer,
      lastVisitDate: new Date().toISOString(),
      daysElapsed: 8,
      serviceName: "Hair Cut + Shave",
      serviceType: "grooming_shave" as const,
      intervalDays: 7,
      isOverdue: true,
      overdueDays: 1,
      reminderSentToday: false,
    };

    const url = generateWhatsAppReminderUrl(customer, reminderInfo, "Belezia Salon");
    expect(url).toContain("https://wa.me/918168584831?text=");
    expect(url).toContain(encodeURIComponent("Mohit"));
    expect(url).toContain(encodeURIComponent("8 days"));
    expect(url).toContain(encodeURIComponent("Belezia Salon"));
  });

  it("tracks if a reminder was already sent today", () => {
    const today = new Date().toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    expect(wasReminderSentToday(today)).toBe(true);
    expect(wasReminderSentToday(twoDaysAgo)).toBe(false);
    expect(wasReminderSentToday(undefined)).toBe(false);
  });

  it("generates direct WhatsApp click-to-chat URL for Raksha Bandhan special offer", () => {
    const customer: Customer = {
      id: "cust-rakhi-1",
      name: "Pooja",
      phone: "9988776655",
      gender: "female",
      total_visits: 2,
      total_spent: 800,
    };

    const url = generateWhatsAppRakhiOfferUrl(customer, "Belezia Salon");
    expect(url).toContain("https://wa.me/919988776655?text=");
    expect(url).toContain(encodeURIComponent("Pooja"));
    expect(url).toContain(encodeURIComponent("FREE NAIL PAINT"));
    expect(url).toContain(encodeURIComponent("31st August 2026"));
  });
});
