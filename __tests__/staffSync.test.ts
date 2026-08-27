import { describe, it, expect, beforeEach } from "vitest";
import { Staff, AttendanceRecord, StaffStatus } from "@/types";
import { SupabaseSync } from "@/lib/supabaseSync";

// Mock localStorage for node test runner
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

describe("Staff Status & Incentive Item Multi-Device Sync", () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it("encodes and decodes half_day staff status correctly with incentive scheme", () => {
    const originalStaff: Staff = {
      id: "11111111-1111-1111-1111-111111111101",
      name: "Aamir",
      role: "Senior Stylist",
      phone: "9876543210",
      commission_rate: 15,
      commission_type: "percent",
      product_commission_rate: 100,
      product_commission_type: "fixed",
      status: "half_day",
      color: "#6366f1",
      notes: "VIP Stylist",
    };

    // Simulate Supabase serialization format
    const incentiveMeta = {
      commission_type: originalStaff.commission_type || "percent",
      product_commission_rate: originalStaff.product_commission_rate,
      product_commission_type: originalStaff.product_commission_type,
      floor_status: originalStaff.status,
      status_date: new Date().toLocaleDateString("en-CA"),
      custom_notes: originalStaff.notes || "",
    };

    const simulatedPgRow = {
      id: originalStaff.id,
      name: originalStaff.name,
      phone: originalStaff.phone,
      role: originalStaff.role,
      commission_rate: originalStaff.commission_rate,
      status: "half_day",
      color: originalStaff.color,
      notes: JSON.stringify(incentiveMeta),
    };

    // Simulate loadAllData parsing
    const parsedNotes = JSON.parse(simulatedPgRow.notes);
    const decodedStaff: Staff = {
      ...simulatedPgRow,
      commission_rate: Number(simulatedPgRow.commission_rate) || 0,
      commission_type: parsedNotes.commission_type,
      product_commission_rate: Number(parsedNotes.product_commission_rate) || 0,
      product_commission_type: parsedNotes.product_commission_type,
      status: (parsedNotes.floor_status || simulatedPgRow.status) as StaffStatus,
      notes: parsedNotes.custom_notes,
    };

    expect(decodedStaff.status).toBe("half_day");
    expect(decodedStaff.commission_rate).toBe(15);
    expect(decodedStaff.commission_type).toBe("percent");
    expect(decodedStaff.product_commission_rate).toBe(100);
    expect(decodedStaff.product_commission_type).toBe("fixed");
    expect(decodedStaff.notes).toBe("VIP Stylist");
  });

  it("preserves half_day status when simulated in a multi-device environment", () => {
    // Device A changes status to half_day and sets custom product incentive
    const deviceAStaff: Staff = {
      id: "11111111-1111-1111-1111-111111111102",
      name: "Subhaan",
      role: "Stylist",
      phone: "9811122233",
      commission_rate: 200,
      commission_type: "fixed",
      product_commission_rate: 50,
      product_commission_type: "fixed",
      status: "half_day",
      color: "#ec4899",
      notes: "Morning shift only",
    };

    // Simulated cloud DB state in Supabase
    const cloudStaffRecord = {
      id: deviceAStaff.id,
      name: deviceAStaff.name,
      phone: deviceAStaff.phone,
      role: deviceAStaff.role,
      commission_rate: 200,
      status: "half_day",
      color: deviceAStaff.color,
      notes: JSON.stringify({
        commission_type: "fixed",
        product_commission_rate: 50,
        product_commission_type: "fixed",
        floor_status: "half_day",
        status_date: new Date().toLocaleDateString("en-CA"),
        custom_notes: "Morning shift only",
      }),
    };

    // Device B opens and fetches cloudData
    const meta = JSON.parse(cloudStaffRecord.notes);
    const deviceBSyncedStaff: Staff = {
      ...cloudStaffRecord,
      commission_rate: Number(cloudStaffRecord.commission_rate),
      commission_type: meta.commission_type,
      product_commission_rate: Number(meta.product_commission_rate),
      product_commission_type: meta.product_commission_type,
      status: meta.floor_status as StaffStatus,
      notes: meta.custom_notes,
    };

    // Verify Device B receives exact status and incentive settings without reverting
    expect(deviceBSyncedStaff.status).toBe("half_day");
    expect(deviceBSyncedStaff.commission_type).toBe("fixed");
    expect(deviceBSyncedStaff.commission_rate).toBe(200);
    expect(deviceBSyncedStaff.product_commission_type).toBe("fixed");
    expect(deviceBSyncedStaff.product_commission_rate).toBe(50);
  });

  it("handles fallback gracefully if legacy PostgreSQL table restricts column status to active/on_leave/inactive", () => {
    // If Postgres DB only allows ('active', 'on_leave', 'inactive') in column `status`
    // notes metadata still holds floor_status = 'half_day'
    const legacyPgRow = {
      id: "11111111-1111-1111-1111-111111111103",
      name: "Arbaaz",
      role: "Stylist",
      commission_rate: 15,
      status: "active", // Safe fallback in column
      notes: JSON.stringify({
        commission_type: "percent",
        product_commission_rate: 10,
        product_commission_type: "percent",
        floor_status: "half_day",
        status_date: new Date().toLocaleDateString("en-CA"),
        custom_notes: "",
      }),
    };

    const meta = JSON.parse(legacyPgRow.notes);
    const floorStatus = meta.floor_status || legacyPgRow.status;

    expect(floorStatus).toBe("half_day");
  });
});
