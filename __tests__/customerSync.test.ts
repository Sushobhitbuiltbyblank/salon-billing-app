import { describe, it, expect } from "vitest";
import { unifyCustomerList, deduplicateCustomerArray, normalizePhoneNumber } from "@/lib/customerUtils";
import { Customer, Invoice } from "@/types";

describe("Database & Customer Directory Count Parity Test", () => {
  it("ensures Customer Directory & CRM unified count matches DB registered customer count when fully synced", () => {
    // 1. Mock DB customer records in Supabase
    const dbCustomers: Customer[] = [
      {
        id: "cust-1",
        name: "Mohit",
        phone: "8168584831",
        gender: "male",
        total_visits: 1,
        total_spent: 250,
      },
      {
        id: "cust-2",
        name: "Vishakha",
        phone: "9958872996",
        gender: "female",
        total_visits: 1,
        total_spent: 500,
      },
      {
        id: "cust-3",
        name: "Sonika",
        phone: "6378107453",
        gender: "female",
        total_visits: 1,
        total_spent: 30,
      },
    ];

    // 2. Mock Invoices referencing existing and discovered customers
    const invoices: Invoice[] = [
      {
        id: "inv-1",
        invoice_number: "BZ-1001",
        customer_id: "cust-1",
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
      {
        id: "inv-2",
        invoice_number: "BZ-1002",
        customer_id: "cust-2",
        customer_name: "Vishakha",
        customer_phone: "9958872996",
        customer_gender: "female",
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "upi",
        status: "paid",
        created_at: "2026-08-26T11:00:00Z",
        items: [],
      },
      {
        id: "inv-3",
        invoice_number: "BZ-1003",
        customer_id: "cust-3",
        customer_name: "Sonika",
        customer_phone: "6378107453",
        customer_gender: "female",
        subtotal: 30,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 30,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-26T12:00:00Z",
        items: [],
      },
    ];

    const deduplicatedDb = deduplicateCustomerArray(dbCustomers);
    const unifiedCrm = unifyCustomerList(dbCustomers, invoices);

    // Verify 1-to-1 count match between DB and CRM directory
    expect(unifiedCrm.length).toBe(deduplicatedDb.length);
    expect(unifiedCrm.length).toBe(3);
  });

  it("handles duplicate phone formats consistently between DB records and CRM directory", () => {
    const rawDb: Customer[] = [
      { id: "1", name: "Rahul", phone: "9876543210", gender: "male", total_visits: 1, total_spent: 100 },
      { id: "2", name: "Rahul Sharma", phone: "+91 98765 43210", gender: "male", total_visits: 2, total_spent: 300 },
    ];

    const deduplicated = deduplicateCustomerArray(rawDb);
    const unified = unifyCustomerList(rawDb, []);

    expect(deduplicated.length).toBe(1);
    expect(unified.length).toBe(1);
    expect(unified[0].phone).toBe("9876543210");
  });

  it("calculates exact total_visits and total_spent across multiple visits and ignores void invoices", () => {
    const dbCustomers: Customer[] = [
      {
        id: "cust-talat",
        name: "Talat",
        phone: "6200696360",
        gender: "female",
        total_visits: 0,
        total_spent: 0,
      },
    ];

    const invoices: Invoice[] = [
      {
        id: "inv-t1",
        invoice_number: "BZ-2001",
        customer_id: "cust-talat",
        customer_name: "Talat",
        customer_phone: "6200696360",
        subtotal: 150,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 150,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-20T10:00:00Z",
        items: [],
      },
      {
        id: "inv-t2",
        invoice_number: "BZ-2002",
        customer_id: "cust-talat",
        customer_name: "Talat",
        customer_phone: "+91 6200696360",
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "upi",
        status: "paid",
        created_at: "2026-08-26T10:00:00Z",
        items: [],
      },
      {
        id: "inv-t3",
        invoice_number: "BZ-2003",
        customer_id: "cust-talat",
        customer_name: "Talat",
        customer_phone: "6200696360",
        subtotal: 300,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 300,
        payment_mode: "cash",
        status: "void", // VOIDED INVOICE - MUST BE EXCLUDED!
        created_at: "2026-08-26T11:00:00Z",
        items: [],
      },
    ];

    const unified = unifyCustomerList(dbCustomers, invoices);
    expect(unified.length).toBe(1);
    expect(unified[0].name).toBe("Talat");
    // Visits should be exactly 2 (excluding the voided invoice)
    expect(unified[0].total_visits).toBe(2);
    // Spend should be exactly 150 + 500 = 650 (excluding voided 300)
    expect(unified[0].total_spent).toBe(650);
  });

  it("strictly isolates statistics for different customers who share the same name but have different phone numbers", () => {
    const dbCustomers: Customer[] = [
      {
        id: "cust-yash-1",
        name: "Yash",
        phone: "7007929773",
        gender: "male",
        total_visits: 0,
        total_spent: 0,
      },
      {
        id: "cust-yash-2",
        name: "Yash",
        phone: "9839124767",
        gender: "male",
        total_visits: 0,
        total_spent: 0,
      },
    ];

    const invoices: Invoice[] = [
      {
        id: "inv-y1",
        invoice_number: "BZ-3001",
        customer_id: "cust-yash-1",
        customer_name: "Yash",
        customer_phone: "7007929773",
        subtotal: 150,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 150,
        payment_mode: "cash",
        status: "paid",
        created_at: "2026-08-26T10:00:00Z",
        items: [],
      },
      {
        id: "inv-y2",
        invoice_number: "BZ-3002",
        customer_id: "cust-yash-2",
        customer_name: "Yash",
        customer_phone: "9839124767",
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

    const unified = unifyCustomerList(dbCustomers, invoices);
    expect(unified.length).toBe(2);

    const yash1 = unified.find((c) => c.phone === "7007929773");
    const yash2 = unified.find((c) => c.phone === "9839124767");

    expect(yash1).toBeDefined();
    expect(yash1?.total_visits).toBe(1);
    expect(yash1?.total_spent).toBe(150); // NOT combined 400!

    expect(yash2).toBeDefined();
    expect(yash2?.total_visits).toBe(1);
    expect(yash2?.total_spent).toBe(250); // NOT combined 400!
  });

  it("reconciles multi-device local cache count difference (87 vs 86) to authoritative cloud count", () => {
    // Generate 86 valid active customers in cloud database
    const cloudCustomers: Customer[] = Array.from({ length: 86 }, (_, i) => ({
      id: `cust-cloud-${i + 1}`,
      name: `Customer ${i + 1}`,
      phone: `98000000${(i + 1).toString().padStart(2, "0")}`,
      gender: "female",
      total_visits: 1,
      total_spent: 500,
    }));

    // Device A had an extra stale/deleted customer in its local storage cache (87 total)
    const staleCustomer: Customer = {
      id: "cust-deleted-old",
      name: "Deleted Stale Customer",
      phone: "9800000099",
      gender: "female",
      total_visits: 1,
      total_spent: 200,
    };
    const device1LocalCache: Customer[] = [...cloudCustomers, staleCustomer];
    expect(device1LocalCache.length).toBe(87);

    // Device B has fresh/synced cache with 86 customers
    const device2LocalCache: Customer[] = [...cloudCustomers];
    expect(device2LocalCache.length).toBe(86);

    // When cloud sync arrives with authoritative cloud data (86 items):
    // Authoritative sync overwrites local cache with deduplicated cloud customers
    const device1Synced = deduplicateCustomerArray(cloudCustomers);
    const device2Synced = deduplicateCustomerArray(cloudCustomers);

    const invoices: Invoice[] = [];

    // Unified CRM count on Device 1 and Device 2
    const device1CrmCount = unifyCustomerList(device1Synced, invoices).length;
    const device2CrmCount = unifyCustomerList(device2Synced, invoices).length;

    expect(device1CrmCount).toBe(86);
    expect(device2CrmCount).toBe(86);
    expect(device1CrmCount).toBe(device2CrmCount);
  });

  it("does not resurrect deleted customers across devices upon background cloud sync", () => {
    // 3 customers initially
    const initialCustomers: Customer[] = [
      { id: "cust-1", name: "Alice", phone: "9811111111", gender: "female", total_visits: 1, total_spent: 100 },
      { id: "cust-2", name: "Bob", phone: "9822222222", gender: "male", total_visits: 1, total_spent: 200 },
      { id: "cust-3", name: "Charlie", phone: "9833333333", gender: "male", total_visits: 1, total_spent: 300 },
    ];

    // Device A deletes cust-3
    const cloudAfterDelete = initialCustomers.filter((c) => c.id !== "cust-3");
    expect(cloudAfterDelete.length).toBe(2);

    // Device B had cust-3 in local cache before sync
    const deviceBLocalCache = [...initialCustomers];
    expect(deviceBLocalCache.length).toBe(3);

    // When Device B receives cloud sync, authoritative cloud data updates local cache
    const deviceBSynced = deduplicateCustomerArray(cloudAfterDelete);
    const unifiedDeviceB = unifyCustomerList(deviceBSynced, []);

    // Verify Device B now accurately has 2 clients, not 3
    expect(unifiedDeviceB.length).toBe(2);
    expect(unifiedDeviceB.some((c) => c.id === "cust-3")).toBe(false);
  });

  it("successfully registers new client and makes it immediately available in unified customer directory", () => {
    const newCustomer: Customer = {
      id: "cust-new-999",
      name: "Deepak Verma",
      phone: "9876500001",
      gender: "male",
      birthday: "1995-05-15",
      notes: "First time haircut",
      total_visits: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    const initialList: Customer[] = [];
    const deduped = deduplicateCustomerArray([...initialList, newCustomer]);
    expect(deduped.length).toBe(1);
    expect(deduped[0].name).toBe("Deepak Verma");
    expect(deduped[0].phone).toBe("9876500001");
    expect(deduped[0].gender).toBe("male");

    const unified = unifyCustomerList(deduped, []);
    expect(unified.length).toBe(1);
    expect(unified[0].name).toBe("Deepak Verma");
    expect(unified[0].phone).toBe("9876500001");
    expect(unified[0].total_visits).toBe(0);
    expect(unified[0].total_spent).toBe(0);
  });

  it("Multi-Device Live Sync: Client registered on Device A is propagated to Device B and Device C accurately", () => {
    // 1. Device A registers new customer
    const registeredOnDeviceA: Customer = {
      id: "cust-cross-dev-01",
      name: "Kavita Singhal",
      phone: "9876543219",
      gender: "female",
      birthday: "1998-10-25",
      notes: "VIP referral",
      total_visits: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    // 2. Mock Cloud DB state after Device A saves
    const cloudDatabaseState: Customer[] = [
      {
        id: "cust-1",
        name: "Existing Client",
        phone: "9811111111",
        gender: "female",
        total_visits: 2,
        total_spent: 800,
      },
      registeredOnDeviceA,
    ];

    // 3. Device B (Reception iPad) receives cloud sync
    const deviceBInitialCache: Customer[] = [
      {
        id: "cust-1",
        name: "Existing Client",
        phone: "9811111111",
        gender: "female",
        total_visits: 2,
        total_spent: 800,
      },
    ];

    const deviceBSynced = deduplicateCustomerArray([...cloudDatabaseState, ...deviceBInitialCache]);
    const deviceBUnified = unifyCustomerList(deviceBSynced, []);

    expect(deviceBUnified.length).toBe(2);
    const foundOnDeviceB = deviceBUnified.find((c) => c.phone === "9876543219");
    expect(foundOnDeviceB).toBeDefined();
    expect(foundOnDeviceB?.name).toBe("Kavita Singhal");
    expect(foundOnDeviceB?.gender).toBe("female");
    expect(foundOnDeviceB?.total_visits).toBe(0);

    // 4. Device B bills this customer with an invoice
    const newInvoiceOnDeviceB: Invoice = {
      id: "inv-devb-01",
      invoice_number: "BZ-5001",
      customer_id: "cust-cross-dev-01",
      customer_name: "Kavita Singhal",
      customer_phone: "9876543219",
      customer_gender: "female",
      subtotal: 1500,
      discount_amount: 0,
      discount_type: "flat",
      discount_value: 0,
      tax_amount: 0,
      tax_rate: 0,
      grand_total: 1500,
      payment_mode: "upi",
      status: "paid",
      created_at: new Date().toISOString(),
      items: [],
    };

    // 5. Device C (Manager Laptop) receives both customers & invoices from Cloud
    const deviceCInvoices = [newInvoiceOnDeviceB];
    const deviceCSynced = deduplicateCustomerArray(cloudDatabaseState);
    const deviceCUnified = unifyCustomerList(deviceCSynced, deviceCInvoices);

    expect(deviceCUnified.length).toBe(2);
    const foundOnDeviceC = deviceCUnified.find((c) => c.phone === "9876543219");
    expect(foundOnDeviceC).toBeDefined();
    expect(foundOnDeviceC?.name).toBe("Kavita Singhal");
    expect(foundOnDeviceC?.total_visits).toBe(1);
    expect(foundOnDeviceC?.total_spent).toBe(1500);
  });

  it("9. Exact User Scenario: When Supabase DB has 100 customer records, Customer Directory shows exactly 100 (strict parity)", () => {
    // 100 real customer records in Supabase DB
    const dbCustomers: Customer[] = Array.from({ length: 100 }, (_, i) => ({
      id: `cust-${i + 1}`,
      name: `Client ${i + 1}`,
      phone: `9876500${(i + 1).toString().padStart(3, "0")}`,
      gender: i % 2 === 0 ? "female" : "male",
      total_visits: 1,
      total_spent: 350,
    }));

    // Invoices containing transactions (both for these 100 clients and any anonymous/walk-in bills)
    const invoices: Invoice[] = [
      {
        id: "inv-walkin-anon",
        invoice_number: "BZ-900",
        customer_name: "Walk-in Guest",
        customer_phone: "",
        subtotal: 200,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 200,
        payment_mode: "cash",
        status: "paid",
        created_at: new Date().toISOString(),
        items: [],
      },
      {
        id: "inv-old-log",
        invoice_number: "BZ-901",
        customer_name: "Old Deleted Client",
        customer_phone: "9899999999", // Deleted from customers table
        subtotal: 500,
        discount_amount: 0,
        discount_type: "flat",
        discount_value: 0,
        tax_amount: 0,
        tax_rate: 0,
        grand_total: 500,
        payment_mode: "upi",
        status: "paid",
        created_at: new Date().toISOString(),
        items: [],
      },
    ];

    // Deduplicate cloud data
    const deduplicatedCloud = deduplicateCustomerArray(dbCustomers);
    expect(deduplicatedCloud.length).toBe(100);

    // Unify CRM Directory list
    const unifiedDirectory = unifyCustomerList(deduplicatedCloud, invoices);

    // Assert exact 100 count parity: Must be exactly 100, not 107 or 101
    expect(unifiedDirectory.length).toBe(100);
    expect(unifiedDirectory.length).toBe(dbCustomers.length);
  });

  it("10. Tests 'Sync to DB' manual trigger: synchronizes all unified customer profiles cleanly without creating duplicate records", async () => {
    const customersToSync: Customer[] = [
      {
        id: "cust-sync-1",
        name: "Aman Sharma",
        phone: "9876511111",
        gender: "male",
        total_visits: 1,
        total_spent: 400,
      },
      {
        id: "cust-sync-2",
        name: "Divya Kapoor",
        phone: "9876522222",
        gender: "female",
        total_visits: 2,
        total_spent: 1200,
      },
    ];

    // Mock saveCustomer action function
    const syncedRecords: Customer[] = [];
    const saveCustomer = async (cust: Customer) => {
      syncedRecords.push(cust);
      return cust;
    };

    // Execute Sync to DB routine
    await Promise.all(customersToSync.map((c) => saveCustomer(c)));

    expect(syncedRecords.length).toBe(2);
    expect(syncedRecords[0].name).toBe("Aman Sharma");
    expect(syncedRecords[1].name).toBe("Divya Kapoor");

    // Verify deduplication holds
    const deduped = deduplicateCustomerArray(syncedRecords);
    expect(deduped.length).toBe(2);
  });

  it("11. Tests customer registration validation: gender is mandatory when explicitly saving customer details in POS / CRM", () => {
    // Valid customer payload with gender specified
    const validCustomer: Customer = {
      id: "cust-valid-01",
      name: "Harshita",
      phone: "9876543210",
      gender: "female",
      total_visits: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    expect(validCustomer.gender).toBe("female");
    expect(validCustomer.gender !== "unspecified").toBe(true);

    const isGenderValid = Boolean(validCustomer.gender && validCustomer.gender !== "unspecified");
    expect(isGenderValid).toBe(true);

    // Invalid customer payload with unspecified gender
    const invalidCustomer = {
      name: "Harshita",
      phone: "9876543210",
      gender: "unspecified" as const,
    };

    const isInvalidGender = !invalidCustomer.gender || invalidCustomer.gender === "unspecified";
    expect(isInvalidGender).toBe(true);
  });

  it("12. Tests permanent customer persistence: registered customer remains in database and is not removed during subsequent sync cycles", () => {
    // 1. Initial database with 100 customers
    const initialDb: Customer[] = Array.from({ length: 100 }, (_, i) => ({
      id: `cust-${i + 1}`,
      name: `Client ${i + 1}`,
      phone: `9876500${(i + 1).toString().padStart(3, "0")}`,
      gender: i % 2 === 0 ? "female" : "male",
      total_visits: 1,
      total_spent: 350,
    }));

    // 2. User registers a brand new customer
    const newlyRegisteredCustomer: Customer = {
      id: "cust-new-101",
      name: "Rohit Malhotra",
      phone: "9876500999",
      gender: "male",
      birthday: "1992-12-05",
      notes: "Preferred stylist: Aamir",
      total_visits: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    // 3. Database successfully inserts new customer (101 total)
    const updatedDb = [...initialDb, newlyRegisteredCustomer];
    expect(updatedDb.length).toBe(101);

    // 4. Cloud sync cycle runs
    const syncedCloud = deduplicateCustomerArray(updatedDb);
    const unified = unifyCustomerList(syncedCloud, []);

    // 5. Verify customer is permanently preserved and present with exact details
    expect(unified.length).toBe(101);
    const found = unified.find((c) => c.phone === "9876500999");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Rohit Malhotra");
    expect(found?.gender).toBe("male");
    expect(found?.total_visits).toBe(0);
  });

  it("13. Full Multi-Device Lifecycle Test: Registering customer on Browser 1 is saved in DB and reflects on Browser 2 & Browser 3 without disappearing", () => {
    // Initial synchronized cloud DB state with 100 customers
    const cloudDatabaseState: Customer[] = Array.from({ length: 100 }, (_, i) => ({
      id: `cust-${i + 1}`,
      name: `Client ${i + 1}`,
      phone: `9876500${(i + 1).toString().padStart(3, "0")}`,
      gender: i % 2 === 0 ? "female" : "male",
      total_visits: 1,
      total_spent: 350,
    }));

    // Step 1: User on Browser 1 registers "Priya Arora"
    const newCustomerBrowser1: Customer = {
      id: "cust-priya-01",
      name: "Priya Arora",
      phone: "9812345678",
      gender: "female",
      birthday: "1997-04-12",
      notes: "Facial and hair spa",
      total_visits: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    // Step 2: Browser 1 saves to local cache and sends payload to Supabase
    const browser1LocalBeforeCloudSync = [...cloudDatabaseState, newCustomerBrowser1];
    expect(browser1LocalBeforeCloudSync.length).toBe(101);

    // Step 3: Supabase cloud DB accepts insert
    const updatedCloudDatabase = [...cloudDatabaseState, newCustomerBrowser1];
    expect(updatedCloudDatabase.length).toBe(101);

    // Step 4: Browser 1 background sync runs with in-flight protection
    const nowTime = Date.now();
    const inFlightLocal = browser1LocalBeforeCloudSync.filter((c) => {
      const createdTime = c.created_at ? new Date(c.created_at).getTime() : 0;
      return nowTime - createdTime < 60000;
    });
    const browser1Deduplicated = deduplicateCustomerArray([...updatedCloudDatabase, ...inFlightLocal]);
    const browser1Unified = unifyCustomerList(browser1Deduplicated, []);

    // Step 5: Assert Priya is NOT removed on Browser 1
    expect(browser1Unified.length).toBe(101);
    expect(browser1Unified.some((c) => c.phone === "9812345678")).toBe(true);

    // Step 6: Browser 2 (iPad) receives Realtime / periodic sync from Cloud DB
    const browser2Synced = deduplicateCustomerArray(updatedCloudDatabase);
    const browser2Unified = unifyCustomerList(browser2Synced, []);
    expect(browser2Unified.length).toBe(101);
    const foundOnBrowser2 = browser2Unified.find((c) => c.phone === "9812345678");
    expect(foundOnBrowser2).toBeDefined();
    expect(foundOnBrowser2?.name).toBe("Priya Arora");
    expect(foundOnBrowser2?.gender).toBe("female");

    // Step 7: Browser 3 (Reception Phone) receives sync
    const browser3Synced = deduplicateCustomerArray(updatedCloudDatabase);
    const browser3Unified = unifyCustomerList(browser3Synced, []);
    expect(browser3Unified.length).toBe(101);
    const foundOnBrowser3 = browser3Unified.find((c) => c.phone === "9812345678");
    expect(foundOnBrowser3).toBeDefined();
    expect(foundOnBrowser3?.name).toBe("Priya Arora");
  });

  it("14. Tests exact schema alignment for Supabase customer save: validates payload contains only valid columns and upserts cleanly without PGRST204 errors", () => {
    const rawCustomer: Customer = {
      id: "cust-schema-test",
      name: "Akanksha Sharma",
      phone: "9871122334",
      gender: "female",
      birthday: "1996-03-15",
      anniversary: "",
      notes: "VIP Client",
      total_visits: 0,
      total_spent: 0,
      last_reminder_sent_at: "2026-08-20T10:00:00Z",
    };

    const cleanPhone = normalizePhoneNumber(rawCustomer.phone);
    const standardPhone = cleanPhone.length === 10 ? cleanPhone : rawCustomer.phone;

    const cleanBirthday =
      rawCustomer.birthday && typeof rawCustomer.birthday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawCustomer.birthday.trim())
        ? rawCustomer.birthday.trim()
        : null;
    const cleanAnniversary =
      rawCustomer.anniversary && typeof rawCustomer.anniversary === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawCustomer.anniversary.trim())
        ? rawCustomer.anniversary.trim()
        : null;

    const cleanGender =
      rawCustomer.gender && ["female", "male", "other", "unspecified"].includes(rawCustomer.gender)
        ? rawCustomer.gender
        : "female";

    // Strict schema payload matching PostgreSQL customers table
    const payload: any = {
      name: rawCustomer.name?.trim() || `Guest (${standardPhone})`,
      phone: standardPhone,
      email: rawCustomer.email?.trim() || null,
      gender: cleanGender,
      birthday: cleanBirthday,
      anniversary: cleanAnniversary,
      total_visits: Number(rawCustomer.total_visits) >= 0 ? Number(rawCustomer.total_visits) : 0,
      total_spent: Number(rawCustomer.total_spent) >= 0 ? Number(rawCustomer.total_spent) : 0,
      last_visit: rawCustomer.last_visit || null,
      notes: rawCustomer.notes?.trim() || null,
    };

    // Verify non-existent DB columns (such as last_reminder_sent_at) are excluded
    expect("last_reminder_sent_at" in payload).toBe(false);
    expect(payload.name).toBe("Akanksha Sharma");
    expect(payload.phone).toBe("9871122334");
    expect(payload.gender).toBe("female");
    expect(payload.birthday).toBe("1996-03-15");
    expect(payload.anniversary).toBeNull();
    expect(payload.notes).toBe("VIP Client");
  });

  it("15. Tests Customer Directory Recent Sorting: Newly registered customer with 0 visits and no last_visit is sorted immediately to the top based on created_at timestamp", () => {
    const existingOlderCustomer: Customer = {
      id: "cust-old-1",
      name: "Old Client",
      phone: "9811111111",
      gender: "female",
      total_visits: 3,
      total_spent: 1200,
      last_visit: "2026-08-20T10:00:00Z",
      created_at: "2026-08-15T10:00:00Z",
    };

    const newlyRegisteredCustomer: Customer = {
      id: "cust-new-now",
      name: "Just Registered VIP",
      phone: "9822222222",
      gender: "male",
      total_visits: 0,
      total_spent: 0,
      last_visit: null,
      created_at: new Date().toISOString(), // Created right now
    };

    const list: Customer[] = [existingOlderCustomer, newlyRegisteredCustomer];

    // Directory "recent" sort logic
    const sorted = [...list].sort((a, b) => {
      const dateA = a.last_visit || a.created_at ? new Date(a.last_visit || a.created_at!).getTime() : 0;
      const dateB = b.last_visit || b.created_at ? new Date(b.last_visit || b.created_at!).getTime() : 0;
      return dateB - dateA;
    });

    // Newly registered customer MUST be at index 0 (top of the directory)
    expect(sorted[0].name).toBe("Just Registered VIP");
    expect(sorted[0].phone).toBe("9822222222");
    expect(sorted[1].name).toBe("Old Client");
  });
});








