import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { SpinClaimRecord } from "@/types/rewards";
import { cleanPhoneNumber, SALON_EVENT_DATE, SALON_EVENT_VENUE, LOREAL_EVENT_TERMS_SHORT } from "@/lib/whatsapp";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

const DATA_DIR = path.join(process.cwd(), "data");
const CLAIMS_FILE = path.join(DATA_DIR, "spin_claims.json");

// Helper to load claims from disk (filtering out incomplete claims without name/phone)
async function loadClaimsFromFile(): Promise<SpinClaimRecord[]> {
  try {
    const content = await fs.readFile(CLAIMS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => Boolean(c.customerName && c.customerName.trim() && c.customerPhone && c.customerPhone.trim())
    );
  } catch {
    return [];
  }
}

// Helper to save claims to disk safely
async function saveClaimsToFile(claims: SpinClaimRecord[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CLAIMS_FILE, JSON.stringify(claims, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write spin claims to file:", err);
  }
}

// GET: Fetch all claims, or verify a specific claim, or check if phone claimed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const verifyCode = searchParams.get("verify") || searchParams.get("code");
    const checkPhone = searchParams.get("phone");

    const claims = await loadClaimsFromFile();

    // 1. Phone number claim check
    if (checkPhone) {
      const cleanPhone = cleanPhoneNumber(checkPhone);
      const match = claims.find(
        (c) => c.customerPhone && cleanPhoneNumber(c.customerPhone) === cleanPhone
      );
      const hasClaimed = Boolean(match);
      return NextResponse.json({
        hasClaimed,
        phone: cleanPhone,
        claim: match || null,
      });
    }

    // 2. Offer verification check
    if (verifyCode) {
      const cleanTarget = verifyCode.trim().toLowerCase();
      const match = claims.find(
        (c) =>
          c.claimCode.toLowerCase() === cleanTarget ||
          c.id.toLowerCase() === cleanTarget
      );

      if (match) {
        return NextResponse.json({
          isValid: true,
          offerDetails: {
            id: match.id,
            offerToken: match.claimCode,
            customerName: match.customerName || "Valued Guest",
            phoneNumber: match.customerPhone || "Not Provided",
            wonItem: match.prizeLabel,
            prizeId: match.prizeId,
            isRedeemed: true,
            redeemedAt: match.createdAt,
            createdAt: match.createdAt,
            eventDate: SALON_EVENT_DATE,
            terms: LOREAL_EVENT_TERMS_SHORT,
            venue: SALON_EVENT_VENUE,
          },
        });
      }

      return NextResponse.json({
        isValid: false,
        error: `No offer found with code "${verifyCode}".`,
      });
    }

    // 3. Return all claims for Admin
    return NextResponse.json({
      success: true,
      claims,
      count: claims.length,
    });
  } catch (err) {
    console.error("GET /api/spin-claims error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to read spin claims" },
      { status: 500 }
    );
  }
}

// POST: Add a new claim record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.claimCode || !body.prizeLabel) {
      return NextResponse.json(
        { success: false, error: "Invalid claim payload" },
        { status: 400 }
      );
    }

    const cleanName = body.customerName ? String(body.customerName).trim() : "";
    const cleanPhone = body.customerPhone ? cleanPhoneNumber(String(body.customerPhone)) : "";

    // Strictly enforce: customer who does not fill name and number must NOT be created/saved in history
    if (!cleanName || !cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer full name and 10-digit WhatsApp number are required to create an offer claim.",
        },
        { status: 400 }
      );
    }

    const newClaim: SpinClaimRecord = {
      id: body.id || `claim-${Date.now()}`,
      claimCode: body.claimCode,
      prizeId: body.prizeId || "prize-custom",
      prizeLabel: body.prizeLabel,
      prizeType: body.prizeType || "product_gift",
      customerName: cleanName,
      customerPhone: cleanPhone,
      wasVerified: body.wasVerified !== undefined ? Boolean(body.wasVerified) : true,
      inventoryDeducted: Boolean(body.inventoryDeducted),
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const currentClaims = await loadClaimsFromFile();
    // Prepend new claim, removing any duplicate with same ID or claimCode (case-insensitive)
    const updatedClaims = [
      newClaim,
      ...currentClaims.filter(
        (c) =>
          c.id !== newClaim.id &&
          c.claimCode.trim().toLowerCase() !== newClaim.claimCode.trim().toLowerCase()
      ),
    ];

    await saveClaimsToFile(updatedClaims);

    // Also attempt Supabase spin_logs insert gracefully if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("spin_logs").upsert({
          id: newClaim.id,
          offer_token: newClaim.claimCode,
          customer_name: newClaim.customerName || "Valued Guest",
          phone_number: newClaim.customerPhone || "Not Provided",
          won_item: newClaim.prizeLabel,
          prize_id: newClaim.prizeId,
          is_redeemed: true,
          redeemed_at: newClaim.createdAt,
          created_at: newClaim.createdAt,
        });
      } catch {
        // Ignore remote Supabase errors if table does not exist
      }
    }

    return NextResponse.json({
      success: true,
      claim: newClaim,
    });
  } catch (err) {
    console.error("POST /api/spin-claims error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save spin claim" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a single claim or all claims
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get("all") === "true";
    const claimId = searchParams.get("id");
    const claimCode = searchParams.get("code");
    const phone = searchParams.get("phone");

    if (clearAll) {
      await saveClaimsToFile([]);

      // Also try clearing Supabase if configured
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase.from("spin_logs").delete().neq("id", "0");
        } catch {
          // ignore
        }
      }

      return NextResponse.json({ success: true, message: "All claims cleared" });
    }

    const currentClaims = await loadClaimsFromFile();
    const cleanPhone = phone ? cleanPhoneNumber(phone) : null;

    const filtered = currentClaims.filter((c) => {
      if (claimId && c.id === claimId) return false;
      if (claimCode && c.claimCode.trim().toLowerCase() === claimCode.trim().toLowerCase()) return false;
      if (cleanPhone && c.customerPhone && cleanPhoneNumber(c.customerPhone) === cleanPhone) return false;
      return true;
    });

    await saveClaimsToFile(filtered);

    // Also try deleting from Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        if (claimCode) {
          await supabase.from("spin_logs").delete().eq("offer_token", claimCode);
        } else if (claimId) {
          await supabase.from("spin_logs").delete().eq("id", claimId);
        } else if (cleanPhone) {
          await supabase.from("spin_logs").delete().eq("phone_number", cleanPhone);
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true, remaining: filtered.length });
  } catch (err) {
    console.error("DELETE /api/spin-claims error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete spin claim" },
      { status: 500 }
    );
  }
}
