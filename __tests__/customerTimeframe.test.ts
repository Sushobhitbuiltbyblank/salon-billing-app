import { describe, it, expect } from "vitest";
import { isCustomerInTimeframe, CustomerTimeframeFilter } from "@/lib/customerUtils";
import { Customer } from "@/types";

describe("Customer Timeframe & Sorting Filters", () => {
  const referenceDate = new Date("2026-08-26T15:00:00Z");

  const customerToday: Customer = {
    id: "c-today",
    name: "Aman Gupta",
    phone: "9876500001",
    gender: "male",
    total_visits: 1,
    total_spent: 500,
    last_visit: "2026-08-26T10:30:00Z",
    created_at: "2026-08-26T10:30:00Z",
  };

  const customerThisWeek: Customer = {
    id: "c-week",
    name: "Pooja Sharma",
    phone: "9876500002",
    gender: "female",
    total_visits: 3,
    total_spent: 1500,
    last_visit: "2026-08-23T11:00:00Z", // 3 days ago
    created_at: "2026-08-01T10:00:00Z",
  };

  const customerThisMonth: Customer = {
    id: "c-month",
    name: "Rohan Verma",
    phone: "9876500003",
    gender: "male",
    total_visits: 2,
    total_spent: 800,
    last_visit: "2026-08-05T14:00:00Z", // Earlier this month
    created_at: "2026-08-05T14:00:00Z",
  };

  const customerOld: Customer = {
    id: "c-old",
    name: "Karan Johar",
    phone: "9876500004",
    gender: "male",
    total_visits: 5,
    total_spent: 3000,
    last_visit: "2026-06-15T09:00:00Z", // 2 months ago
    created_at: "2026-06-15T09:00:00Z",
  };

  it("correctly identifies 'today' customers", () => {
    expect(isCustomerInTimeframe(customerToday, "today", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisWeek, "today", referenceDate)).toBe(false);
    expect(isCustomerInTimeframe(customerThisMonth, "today", referenceDate)).toBe(false);
    expect(isCustomerInTimeframe(customerOld, "today", referenceDate)).toBe(false);
  });

  it("correctly identifies 'this week' (last 7 days) customers", () => {
    expect(isCustomerInTimeframe(customerToday, "week", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisWeek, "week", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisMonth, "week", referenceDate)).toBe(false);
    expect(isCustomerInTimeframe(customerOld, "week", referenceDate)).toBe(false);
  });

  it("correctly identifies 'this month' customers", () => {
    expect(isCustomerInTimeframe(customerToday, "month", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisWeek, "month", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisMonth, "month", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerOld, "month", referenceDate)).toBe(false);
  });

  it("returns true for all customers when timeframe is 'all'", () => {
    expect(isCustomerInTimeframe(customerToday, "all", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisWeek, "all", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerThisMonth, "all", referenceDate)).toBe(true);
    expect(isCustomerInTimeframe(customerOld, "all", referenceDate)).toBe(true);
  });

  it("sorts customers accurately by spend, visits, name, and recent date", () => {
    const list = [customerToday, customerThisWeek, customerThisMonth, customerOld];

    // 1. By Spend (Highest first)
    const bySpend = [...list].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
    expect(bySpend[0].name).toBe("Karan Johar"); // 3000
    expect(bySpend[1].name).toBe("Pooja Sharma"); // 1500

    // 2. By Visits (Most first)
    const byVisits = [...list].sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
    expect(byVisits[0].name).toBe("Karan Johar"); // 5 visits
    expect(byVisits[1].name).toBe("Pooja Sharma"); // 3 visits

    // 3. By Name (A-Z)
    const byName = [...list].sort((a, b) => a.name.localeCompare(b.name));
    expect(byName[0].name).toBe("Aman Gupta");
    expect(byName[3].name).toBe("Rohan Verma");

    // 4. By Recent Visit
    const byRecent = [...list].sort((a, b) => {
      const dateA = a.last_visit ? new Date(a.last_visit).getTime() : 0;
      const dateB = b.last_visit ? new Date(b.last_visit).getTime() : 0;
      return dateB - dateA;
    });
    expect(byRecent[0].name).toBe("Aman Gupta"); // Aug 26
    expect(byRecent[1].name).toBe("Pooja Sharma"); // Aug 23
  });
});
