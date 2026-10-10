import { NextResponse } from "next/server";
import { SpinClaimRecord } from "@/types/rewards";
import { cleanPhoneNumber, SALON_EVENT_DATE, SALON_EVENT_VENUE, LOREAL_EVENT_TERMS_SHORT } from "@/lib/whatsapp";
import {
  loadCloudClaims,
  addCloudClaim,
  deleteCloudClaim,
} from "@/lib/spinCloudStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

// GET: Fetch all claims (with optional pagination & search), or verify a specific claim, or check if phone claimed
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const verifyCode = searchParams.get("verify") || searchParams.get("code");
    const checkPhone = searchParams.get("phone");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const searchQuery = searchParams.get("search") || searchParams.get("q");

    const claims = await loadCloudClaims();

    // 1. Phone number claim check (anti-fraud: one claim per phone number)
    if (checkPhone) {
      const cleanPhone = cleanPhoneNumber(checkPhone);
      let match = claims.find(
        (c) => c.customerPhone && cleanPhoneNumber(c.customerPhone) === cleanPhone
      );

      // Also check customer profile directly in Supabase if not found in claims array
      if (!match && isSupabaseConfigured() && supabase && cleanPhone) {
        try {
          const { data: cust } = await supabase
            .from("customers")
            .select("name, notes")
            .eq("phone", cleanPhone)
            .maybeSingle();

          if (cust?.notes && cust.notes.includes("spin_claim")) {
            const parsed = JSON.parse(cust.notes);
            if (parsed.spin_claim) {
              match = parsed.spin_claim;
            }
          }
        } catch {}
      }

      const hasClaimed = Boolean(match);
      return NextResponse.json(
        {
          hasClaimed,
          phone: cleanPhone,
          claim: match || null,
        },
        { headers: NO_CACHE_HEADERS }
      );
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
        return NextResponse.json(
          {
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
          },
          { headers: NO_CACHE_HEADERS }
        );
      }

      return NextResponse.json(
        {
          isValid: false,
          error: `No offer found with code "${verifyCode}".`,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Filter by search query if supplied
    let filtered = claims;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = claims.filter(
        (c) =>
          c.claimCode.toLowerCase().includes(q) ||
          (c.customerPhone && c.customerPhone.includes(q)) ||
          (c.customerName && c.customerName.toLowerCase().includes(q)) ||
          (c.prizeLabel && c.prizeLabel.toLowerCase().includes(q))
      );
    }

    // 3. Pagination support (e.g. ?page=1&limit=10)
    if (pageParam !== null) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, parseInt(limitParam || "10", 10) || 10);
      const totalFiltered = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
      const startIndex = (page - 1) * limit;
      const paginatedClaims = filtered.slice(startIndex, startIndex + limit);

      return NextResponse.json(
        {
          success: true,
          claims: paginatedClaims,
          total: totalFiltered,
          totalClaims: claims.length,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Return all claims for Admin Customer Claim History (default backward compatible)
    return NextResponse.json(
      {
        success: true,
        claims: filtered,
        total: filtered.length,
        count: filtered.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("GET /api/spin-claims error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to read spin claims" },
      { status: 500, headers: NO_CACHE_HEADERS }
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

    // Strictly enforce: customer who does not fill name and valid 10-digit number must NOT be created/saved
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

    const updatedClaims = await addCloudClaim(newClaim);

    return NextResponse.json(
      {
        success: true,
        claim: newClaim,
        count: updatedClaims.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("POST /api/spin-claims error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save spin claim" },
      { status: 500, headers: NO_CACHE_HEADERS }
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

    const remaining = await deleteCloudClaim({
      id: claimId,
      code: claimCode,
      phone,
      clearAll,
    });

    return NextResponse.json(
      {
        success: true,
        message: clearAll ? "All claims cleared" : "Claim deleted",
        remaining: remaining.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("DELETE /api/spin-claims error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete spin claim" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

