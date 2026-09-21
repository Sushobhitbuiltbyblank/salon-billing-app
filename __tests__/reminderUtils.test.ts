import { describe, it, expect } from "vitest";
import {
  detectCustomerReminders,
  generateWhatsAppReminderUrl,
  getNextMonthlyDueDate,
  wasReminderSentToday,
  formatReminderTime,
} from "@/lib/reminderUtils";
import { Customer, Invoice } from "@/types";

describe("Customer Reminder Engine - Monthly Follow-ups", () => {
  describe("getNextMonthlyDueDate calendar calculations", () => {
    it("calculates 1 month later for normal dates (e.g. 24 Aug -> 24 Sep)", () => {
      const aug24 = new Date(2026, 7, 24); // Month index 7 = August
      const dueDate = getNextMonthlyDueDate(aug24);

      expect(dueDate.getFullYear()).toBe(2026);
      expect(dueDate.getMonth()).toBe(8); // Month index 8 = September
      expect(dueDate.getDate()).toBe(24);
    });

    it("clamps 31st to 30th if the next month has 30 days (e.g. 31 Aug -> 30 Sep)", () => {
      const aug31 = new Date(2026, 7, 31); // 31 August
      const dueDate = getNextMonthlyDueDate(aug31);

      expect(dueDate.getFullYear()).toBe(2026);
      expect(dueDate.getMonth()).toBe(8); // September
      expect(dueDate.getDate()).toBe(30); // Clamped to 30
    });

    it("clamps 31st to 30th for March to April (31 Mar -> 30 Apr)", () => {
      const mar31 = new Date(2026, 2, 31); // 31 March
      const dueDate = getNextMonthlyDueDate(mar31);

      expect(dueDate.getFullYear()).toBe(2026);
      expect(dueDate.getMonth()).toBe(3); // April
      expect(dueDate.getDate()).toBe(30);
    });

    it("clamps 31st to 28th for January to February in a non-leap year (31 Jan 2026 -> 28 Feb 2026)", () => {
      const jan31_2026 = new Date(2026, 0, 31); // 31 January 2026
      const dueDate = getNextMonthlyDueDate(jan31_2026);

      expect(dueDate.getFullYear()).toBe(2026);
      expect(dueDate.getMonth()).toBe(1); // February
      expect(dueDate.getDate()).toBe(28);
    });

    it("clamps 31st to 29th for January to February in a leap year (31 Jan 2024 -> 29 Feb 2024)", () => {
      const jan31_2024 = new Date(2024, 0, 31); // 31 January 2024 (Leap year)
      const dueDate = getNextMonthlyDueDate(jan31_2024);

      expect(dueDate.getFullYear()).toBe(2024);
      expect(dueDate.getMonth()).toBe(1); // February
      expect(dueDate.getDate()).toBe(29);
    });

    it("rolls over year for December to January (31 Dec 2025 -> 31 Jan 2026)", () => {
      const dec31 = new Date(2025, 11, 31); // 31 December 2025
      const dueDate = getNextMonthlyDueDate(dec31);

      expect(dueDate.getFullYear()).toBe(2026);
      expect(dueDate.getMonth()).toBe(0); // January
      expect(dueDate.getDate()).toBe(31);
    });
  });

  describe("detectCustomerReminders overdue detection", () => {
    it("marks customer overdue when 1 calendar month has elapsed", () => {
      // Visit 35 days ago (clearly overdue for 1 month)
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();

      const customer: Customer = {
        id: "cust-1",
        name: "Amit",
        phone: "9876543210",
        gender: "male",
        total_visits: 1,
        total_spent: 300,
        last_visit: thirtyFiveDaysAgo,
      };

      const invoice: Invoice = {
        id: "inv-1",
        invoice_number: "BZ-1001",
        customer_id: "cust-1",
        customer_name: "Amit",
        customer_phone: "9876543210",
        subtotal: 300,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 300,
        payment_mode: "cash",
        status: "paid",
        created_at: thirtyFiveDaysAgo,
        items: [
          {
            id: "it-1",
            item_name: "Haircut & Beard Styling",
            item_type: "service",
            quantity: 1,
            unit_price: 300,
            discount: 0,
            total_price: 300,
          },
        ],
      };

      const reminders = detectCustomerReminders([customer], [invoice]);
      expect(reminders.length).toBe(1);
      expect(reminders[0].isOverdue).toBe(true);
      expect(reminders[0].serviceName).toBe("Haircut & Beard Styling");
      expect(reminders[0].dueDate).toBeDefined();
    });

    it("marks customer NOT overdue if visit was recent (e.g. 10 days ago)", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

      const customer: Customer = {
        id: "cust-2",
        name: "Priya",
        phone: "9876543211",
        gender: "female",
        total_visits: 1,
        total_spent: 500,
        last_visit: tenDaysAgo,
      };

      const invoice: Invoice = {
        id: "inv-2",
        invoice_number: "BZ-1002",
        customer_id: "cust-2",
        customer_name: "Priya",
        customer_phone: "9876543211",
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "upi",
        status: "paid",
        created_at: tenDaysAgo,
        items: [
          {
            id: "it-2",
            item_name: "Hair Spa",
            item_type: "service",
            quantity: 1,
            unit_price: 500,
            discount: 0,
            total_price: 500,
          },
        ],
      };

      const reminders = detectCustomerReminders([customer], [invoice]);
      expect(reminders.length).toBe(1);
      expect(reminders[0].isOverdue).toBe(false);
      expect(reminders[0].overdueDays).toBe(0);
    });

    it("sorts overdue pending customers before overdue sent-today customers", () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const today = new Date().toISOString();

      const pendingCustomer: Customer = {
        id: "cust-pending",
        name: "Rahul",
        phone: "9876543210",
        gender: "male",
        total_visits: 1,
        total_spent: 200,
        last_visit: fortyDaysAgo,
      };

      const sentTodayCustomer: Customer = {
        id: "cust-sent",
        name: "Vikas",
        phone: "9876543219",
        gender: "male",
        total_visits: 1,
        total_spent: 200,
        last_visit: fortyDaysAgo,
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
          created_at: fortyDaysAgo,
          items: [{ id: "i1", item_name: "Beard Grooming", item_type: "service", quantity: 1, unit_price: 200, discount: 0, total_price: 200 }],
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
          created_at: fortyDaysAgo,
          items: [{ id: "i2", item_name: "Beard Grooming", item_type: "service", quantity: 1, unit_price: 200, discount: 0, total_price: 200 }],
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
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const customer: Customer = {
        id: "cust-transition",
        name: "Rohit",
        phone: "9876543299",
        gender: "male",
        total_visits: 1,
        total_spent: 150,
        last_visit: fortyDaysAgo,
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
        created_at: fortyDaysAgo,
        items: [{ id: "it", item_name: "Haircut", item_type: "service", quantity: 1, unit_price: 150, discount: 0, total_price: 150 }],
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
            service_name: "Haircut",
            notes: "Marked sent",
          },
        ],
        updated_at: nowIso,
      };
      rems = detectCustomerReminders([markedCustomer], [invoice]);
      expect(rems[0].reminderSentToday).toBe(true);
      expect(rems[0].lastReminderSentAt).toBe(nowIso);
      expect(rems[0].reminderHistory?.length).toBe(1);

      // 3. Reset back to pending
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

  describe("WhatsApp Reminder URL Generation & Formatting", () => {
    it("generates a clean WhatsApp reminder URL with Free Face De-Tan offer message", () => {
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
        dueDate: new Date().toISOString(),
        daysElapsed: 31,
        serviceName: "Haircut & Beard Styling",
        isOverdue: true,
        overdueDays: 1,
        reminderSentToday: false,
      };

      const url = generateWhatsAppReminderUrl(customer, reminderInfo, "belezia Salon, Laxmi Nagar");
      expect(url).toContain("https://wa.me/918168584831?text=");
      expect(url).toContain(encodeURIComponent("GET FACE DE-TAN ABSOLUTELY FREE"));
      expect(url).toContain(encodeURIComponent("Free DeTan Offer valid till"));
      expect(url).toContain(encodeURIComponent("Hi Mohit, Its been long since you took any services at belezia Salon, Laxmi Nagar."));
      expect(url).toContain(encodeURIComponent("Time for a fresh service and get a face detan absolutely free."));
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
      expect(formattedToday).toMatch(/am|pm/i);

      const pastDateIso = new Date("2026-08-15T14:30:00Z").toISOString();
      const formattedPast = formatReminderTime(pastDateIso);
      expect(formattedPast.length).toBeGreaterThan(0);
      expect(formatReminderTime(undefined)).toBe("");
      expect(formatReminderTime(null)).toBe("");
    });
  });
});
