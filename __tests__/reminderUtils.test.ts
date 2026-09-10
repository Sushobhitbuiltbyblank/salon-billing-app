import { describe, it, expect } from "vitest";
import {
  detectCustomerReminders,
  generateWhatsAppReminderUrl,
  isGroomingOrShaveService,
  wasReminderSentToday,
  formatReminderTime,
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

  it("formats reminder timestamps cleanly with formatReminderTime", () => {
    const now = new Date();
    const todayIso = now.toISOString();
    const formattedToday = formatReminderTime(todayIso);
    expect(formattedToday.length).toBeGreaterThan(0);
    // When sent today, it should contain AM or PM
    expect(formattedToday).toMatch(/am|pm/i);

    const pastDateIso = new Date("2026-08-15T14:30:00Z").toISOString();
    const formattedPast = formatReminderTime(pastDateIso);
    expect(formattedPast.length).toBeGreaterThan(0);
    expect(formatReminderTime(undefined)).toBe("");
    expect(formatReminderTime(null)).toBe("");
  });

  it("sorts overdue pending customers before overdue sent-today customers", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();

    const pendingCustomer: Customer = {
      id: "cust-pending",
      name: "Rahul",
      phone: "9876543210",
      gender: "male",
      total_visits: 1,
      total_spent: 200,
      last_visit: tenDaysAgo,
    };

    const sentTodayCustomer: Customer = {
      id: "cust-sent",
      name: "Vikas",
      phone: "9876543219",
      gender: "male",
      total_visits: 1,
      total_spent: 200,
      last_visit: tenDaysAgo,
      last_reminder_sent_at: today,
    };

    const invoices: Invoice[] = [
      {
        id: "inv-p",
        invoice_number: "BZ-P",
        customer_id: "cust-pending",
        customer_phone: "9876543210",
        subtotal: 200,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 200,
        payment_mode: "cash",
        status: "paid",
        created_at: tenDaysAgo,
        items: [{ id: "i1", item_name: "Beard Trim", item_type: "service", quantity: 1, unit_price: 200, discount: 0, total_price: 200 }],
      },
      {
        id: "inv-s",
        invoice_number: "BZ-S",
        customer_id: "cust-sent",
        customer_phone: "9876543219",
        subtotal: 200,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 200,
        payment_mode: "cash",
        status: "paid",
        created_at: tenDaysAgo,
        items: [{ id: "i2", item_name: "Beard Trim", item_type: "service", quantity: 1, unit_price: 200, discount: 0, total_price: 200 }],
      },
    ];

    const reminders = detectCustomerReminders([sentTodayCustomer, pendingCustomer], invoices);
    expect(reminders.length).toBe(2);
    // Pending customer must come first
    expect(reminders[0].customer.id).toBe("cust-pending");
    expect(reminders[0].reminderSentToday).toBe(false);
    expect(reminders[1].customer.id).toBe("cust-sent");
    expect(reminders[1].reminderSentToday).toBe(true);
  });

  it("handles status transitions: marking reminder as sent and resetting back to pending", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const customer: Customer = {
      id: "cust-transition",
      name: "Rohit",
      phone: "9876543299",
      gender: "male",
      total_visits: 1,
      total_spent: 150,
      last_visit: tenDaysAgo,
    };

    const invoice: Invoice = {
      id: "inv-t",
      invoice_number: "BZ-T",
      customer_id: "cust-transition",
      customer_phone: "9876543299",
      subtotal: 150,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 150,
      payment_mode: "cash",
      status: "paid",
      created_at: tenDaysAgo,
      items: [{ id: "it", item_name: "Beard Shave", item_type: "service", quantity: 1, unit_price: 150, discount: 0, total_price: 150 }],
    };

    // 1. Initial pending state
    let rems = detectCustomerReminders([customer], [invoice]);
    expect(rems[0].isOverdue).toBe(true);
    expect(rems[0].reminderSentToday).toBe(false);

    // 2. Mark sent today
    const nowIso = new Date().toISOString();
    const markedCustomer: Customer = {
      ...customer,
      last_reminder_sent_at: nowIso,
      reminder_history: [
        {
          id: "hist-1",
          sent_at: nowIso,
          channel: "manual",
          service_name: "Beard Shave",
          notes: "Marked sent",
        },
      ],
      updated_at: nowIso,
    };
    rems = detectCustomerReminders([markedCustomer], [invoice]);
    expect(rems[0].reminderSentToday).toBe(true);
    expect(rems[0].lastReminderSentAt).toBe(nowIso);
    expect(rems[0].reminderHistory.length).toBe(1);

    // 3. Reset back to pending (null or cleared)
    const resetCustomer: Customer = {
      ...markedCustomer,
      last_reminder_sent_at: undefined,
      updated_at: new Date().toISOString(),
    };
    rems = detectCustomerReminders([resetCustomer], [invoice]);
    expect(rems[0].reminderSentToday).toBe(false);
    expect(rems[0].lastReminderSentAt).toBeUndefined();
  });
});
