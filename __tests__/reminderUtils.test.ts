import { describe, it, expect } from "vitest";
import {
  detectCustomerReminders,
  generateWhatsAppReminderUrl,
  getNextMonthlyDueDate,
  wasReminderSentToday,
  formatReminderTime,
  isReminderInCooldown,
  getDaysRemainingInCooldown,
  formatReminderCooldownStatus,
  REMINDER_COOLDOWN_DAYS,
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

    it("places today's due reminders strictly on top of older overdue pending reminders", () => {
      const now = new Date();
      // Exactly 1 month ago today -> due today!
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      // 60 days ago -> overdue by ~30 days
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const olderOverdueCustomer: Customer = {
        id: "cust-older-overdue",
        name: "Old Overdue Customer",
        phone: "9876543201",
        last_visit: sixtyDaysAgo,
        total_visits: 1,
        total_spent: 300,
      };

      const dueTodayCustomer: Customer = {
        id: "cust-due-today",
        name: "Due Today Customer",
        phone: "9876543202",
        last_visit: oneMonthAgo,
        total_visits: 1,
        total_spent: 300,
      };

      const invoices: Invoice[] = [
        {
          id: "inv-old",
          invoice_number: "INV-OLD",
          customer_id: "cust-older-overdue",
          customer_phone: "9876543201",
          subtotal: 300,
          discount_amount: 0,
          discount_type: "flat",
          discount_value: 0,
          tax_amount: 0,
          tax_rate: 0,
          grand_total: 300,
          payment_mode: "cash",
          status: "paid",
          created_at: sixtyDaysAgo,
          items: [{ id: "it-old", item_name: "Haircut", item_type: "service", quantity: 1, unit_price: 300, discount: 0, total_price: 300 }],
        },
        {
          id: "inv-today",
          invoice_number: "INV-TODAY",
          customer_id: "cust-due-today",
          customer_phone: "9876543202",
          subtotal: 300,
          discount_amount: 0,
          discount_type: "flat",
          discount_value: 0,
          tax_amount: 0,
          tax_rate: 0,
          grand_total: 300,
          payment_mode: "cash",
          status: "paid",
          created_at: oneMonthAgo,
          items: [{ id: "it-today", item_name: "Haircut", item_type: "service", quantity: 1, unit_price: 300, discount: 0, total_price: 300 }],
        },
      ];

      // Pass older customer first in array to verify sorting reorders properly
      const reminders = detectCustomerReminders([olderOverdueCustomer, dueTodayCustomer], invoices);
      expect(reminders.length).toBe(2);
      expect(reminders[0].customer.id).toBe("cust-due-today");
      expect(reminders[0].isDueToday).toBe(true);
      expect(reminders[1].customer.id).toBe("cust-older-overdue");
      expect(reminders[1].isDueToday).toBe(false);
    });

    it("places today's sent reminders strictly on top of older sent reminders", () => {
      const now = new Date();
      const todayIso = now.toISOString();
      const fiveDaysAgoIso = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

      const sentEarlierCustomer: Customer = {
        id: "cust-sent-5d-ago",
        name: "Sent Earlier",
        phone: "9876543211",
        last_visit: fortyDaysAgo,
        last_reminder_sent_at: fiveDaysAgoIso,
        total_visits: 1,
        total_spent: 300,
      };

      const sentTodayCustomer: Customer = {
        id: "cust-sent-today",
        name: "Sent Today",
        phone: "9876543212",
        last_visit: fortyDaysAgo,
        last_reminder_sent_at: todayIso,
        total_visits: 1,
        total_spent: 300,
      };

      const invoices: Invoice[] = [];
      const reminders = detectCustomerReminders([sentEarlierCustomer, sentTodayCustomer], invoices);

      expect(reminders.length).toBe(2);
      expect(reminders[0].customer.id).toBe("cust-sent-today");
      expect(reminders[0].reminderSentToday).toBe(true);
      expect(reminders[1].customer.id).toBe("cust-sent-5d-ago");
      expect(reminders[1].reminderSentToday).toBe(false);
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
        inCooldown: true,
        cooldownRemainingDays: 30,
      };

      const url = generateWhatsAppReminderUrl(customer, reminderInfo, "Belezia Salon, Laxmi Nagar");
      expect(url).toContain("https://wa.me/918168584831?text=");
      expect(url).toContain(encodeURIComponent("*GET FACE DE-TAN ABSOLUTELY FREE*"));
      expect(url).toContain(encodeURIComponent("Free DeTan Offer valid till"));
      expect(url).toContain(encodeURIComponent("on showing this message"));
      expect(url).not.toContain(encodeURIComponent("*No other T&Cs*"));
      expect(url).toContain(encodeURIComponent("Hi Mohit, Its been long since you took any services at Belezia Salon, Laxmi Nagar."));
      expect(url).toContain(encodeURIComponent("Time for a fresh service and get a face detan absolutely free."));
      expect(url).toContain(encodeURIComponent("Google Review (Rate us 5-Stars):"));
      expect(url).toContain(encodeURIComponent("https://g.page/r/CbGd_cwnL9zrEBM/review"));
      expect(url).toContain(encodeURIComponent("Follow us on Instagram:"));
      expect(url).toContain(encodeURIComponent("https://www.instagram.com/beleziasalonlaxminagar"));
    });

    it("supports custom Google review and Instagram links from SalonSettings", () => {
      const customer: Customer = {
        id: "cust-test-links",
        name: "Pooja",
        phone: "9876543210",
      };
      const customSettings = {
        salon_name: "Belezia Premium",
        google_review_url: "https://g.page/custom-salon-review",
        instagram_url: "https://instagram.com/customsalon",
      } as any;

      const url = generateWhatsAppReminderUrl(customer, undefined, customSettings);
      expect(url).toContain(encodeURIComponent("https://g.page/custom-salon-review"));
      expect(url).toContain(encodeURIComponent("https://instagram.com/customsalon"));
      expect(url).not.toContain(encodeURIComponent("*No other T&Cs*"));
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

  describe("30-Day Reminder Cooldown Logic", () => {
    it("defines REMINDER_COOLDOWN_DAYS as 30", () => {
      expect(REMINDER_COOLDOWN_DAYS).toBe(30);
    });

    it("evaluates isReminderInCooldown accurately across date ranges", () => {
      const now = Date.now();
      const today = new Date().toISOString();
      const yesterday = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
      const twentyNineDaysAgo = new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyOneDaysAgo = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();

      expect(isReminderInCooldown(today)).toBe(true);
      expect(isReminderInCooldown(yesterday)).toBe(true);
      expect(isReminderInCooldown(tenDaysAgo)).toBe(true);
      expect(isReminderInCooldown(twentyNineDaysAgo)).toBe(true);
      expect(isReminderInCooldown(thirtyOneDaysAgo)).toBe(false);
      expect(isReminderInCooldown(undefined)).toBe(false);
      expect(isReminderInCooldown(null)).toBe(false);
    });

    it("calculates remaining days in cooldown accurately with getDaysRemainingInCooldown", () => {
      const now = Date.now();
      const today = new Date().toISOString();
      const yesterday = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

      expect(getDaysRemainingInCooldown(today)).toBe(30);
      expect(getDaysRemainingInCooldown(yesterday)).toBe(29);
      expect(getDaysRemainingInCooldown(tenDaysAgo)).toBe(20);
      expect(getDaysRemainingInCooldown(thirtyDaysAgo)).toBe(0);
      expect(getDaysRemainingInCooldown(undefined)).toBe(0);
    });

    it("formats cooldown status text with formatReminderCooldownStatus", () => {
      const now = Date.now();
      const today = new Date().toISOString();
      const yesterday = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
      const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();

      expect(formatReminderCooldownStatus(today)).toBe("Sent Today");
      expect(formatReminderCooldownStatus(yesterday)).toBe("Sent Yesterday • 29d cooldown");
      expect(formatReminderCooldownStatus(fiveDaysAgo)).toBe("Sent 5d ago • 25d cooldown");
      expect(formatReminderCooldownStatus(undefined)).toBe("");
    });

    it("suppresses customer from pending when reminded yesterday", () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

      const customer: Customer = {
        id: "cust-cooldown",
        name: "Vikram",
        phone: "9812345678",
        gender: "male",
        total_visits: 1,
        total_spent: 200,
        last_visit: fortyDaysAgo,
        last_reminder_sent_at: yesterday,
      };

      const invoice: Invoice = {
        id: "inv-cd",
        invoice_number: "BZ-CD",
        customer_id: "cust-cooldown",
        customer_name: "Vikram",
        customer_phone: "9812345678",
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
        items: [{ id: "it-1", item_name: "Haircut", item_type: "service", quantity: 1, unit_price: 200, discount: 0, total_price: 200 }],
      };

      const rems = detectCustomerReminders([customer], [invoice]);
      expect(rems.length).toBe(1);
      expect(rems[0].isOverdue).toBe(true);
      expect(rems[0].reminderSentToday).toBe(false); // Not sent today
      expect(rems[0].inCooldown).toBe(true); // BUT in 30-day cooldown!
      expect(rems[0].cooldownRemainingDays).toBe(29);
    });

    it("returns customer to pending when cooldown has expired (e.g. 35 days ago)", () => {
      const seventyDaysAgo = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();

      const customer: Customer = {
        id: "cust-expired-cd",
        name: "Pooja",
        phone: "9899887766",
        gender: "female",
        total_visits: 1,
        total_spent: 500,
        last_visit: seventyDaysAgo,
        last_reminder_sent_at: thirtyFiveDaysAgo,
      };

      const invoice: Invoice = {
        id: "inv-exp",
        invoice_number: "BZ-EXP",
        customer_id: "cust-expired-cd",
        customer_name: "Pooja",
        customer_phone: "9899887766",
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "cash",
        status: "paid",
        created_at: seventyDaysAgo,
        items: [{ id: "it-2", item_name: "Facial", item_type: "service", quantity: 1, unit_price: 500, discount: 0, total_price: 500 }],
      };

      const rems = detectCustomerReminders([customer], [invoice]);
      expect(rems.length).toBe(1);
      expect(rems[0].isOverdue).toBe(true);
      expect(rems[0].inCooldown).toBe(false); // Cooldown expired!
      expect(rems[0].cooldownRemainingDays).toBe(0);
    });

    it("resets reminder and clears cooldown when customer visits after reminder", () => {
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const today = new Date().toISOString();

      // Customer visited 35 days ago, was sent a reminder 5 days ago, and visited TODAY
      const customer: Customer = {
        id: "cust-visited-after",
        name: "Rahul",
        phone: "9811223344",
        gender: "male",
        total_visits: 2,
        total_spent: 600,
        last_visit: today,
        last_reminder_sent_at: fiveDaysAgo, // Sent 5 days ago
      };

      const pastInvoice: Invoice = {
        id: "inv-past",
        invoice_number: "BZ-PAST",
        customer_id: "cust-visited-after",
        customer_name: "Rahul",
        customer_phone: "9811223344",
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
        items: [{ id: "it-p", item_name: "Haircut", item_type: "service", quantity: 1, unit_price: 300, discount: 0, total_price: 300 }],
      };

      const newInvoice: Invoice = {
        id: "inv-new",
        invoice_number: "BZ-NEW",
        customer_id: "cust-visited-after",
        customer_name: "Rahul",
        customer_phone: "9811223344",
        subtotal: 300,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 300,
        payment_mode: "cash",
        status: "paid",
        created_at: today, // New visit today!
        items: [{ id: "it-n", item_name: "Hair Spa", item_type: "service", quantity: 1, unit_price: 300, discount: 0, total_price: 300 }],
      };

      const rems = detectCustomerReminders([customer], [pastInvoice, newInvoice]);
      expect(rems.length).toBe(1);
      // Because customer visited today, they are not overdue (due 1 month from today)
      expect(rems[0].isOverdue).toBe(false);
      // Cooldown for the old visit is cleared
      expect(rems[0].inCooldown).toBe(false);
      expect(rems[0].hasVisitedSinceReminder).toBe(true);
      expect(rems[0].cooldownRemainingDays).toBe(0);
    });
  });
});
