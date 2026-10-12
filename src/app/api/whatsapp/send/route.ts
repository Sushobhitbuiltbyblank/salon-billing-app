import { NextResponse } from "next/server";
import { cleanPhoneNumber } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export interface SendWhatsAppRequest {
  phone: string;
  message: string;
  customerName?: string;
  provider?: "mock" | "meta" | "custom_webhook";
  config?: {
    apiToken?: string;
    phoneNumberId?: string;
    apiUrl?: string;
    customHeaders?: Record<string, string>;
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body: SendWhatsAppRequest = await request.json();
    const { phone, message, customerName, provider = "mock", config } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required." },
        { status: 400 }
      );
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid phone number (+91 ${phone}). Please enter a valid 10-digit Indian mobile number.`,
        },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const formattedRecipient = `91${cleanPhone}`;
    const clickToChatUrl = `https://wa.me/${formattedRecipient}?text=${encodeURIComponent(
      message.trim()
    )}`;

    // 1. META WHATSAPP CLOUD API PROVIDER
    if (provider === "meta") {
      const apiToken =
        config?.apiToken?.trim() || process.env.WHATSAPP_API_TOKEN?.trim();
      const phoneNumberId =
        config?.phoneNumberId?.trim() ||
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

      if (!apiToken || !phoneNumberId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing Meta WhatsApp credentials. Please provide Access Token and Phone Number ID in configuration or environment variables.",
            hint: "You can switch to Sandbox / Simulator mode to test without live credentials.",
          },
          { status: 400 }
        );
      }

      const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedRecipient,
        type: "text",
        text: {
          preview_url: true,
          body: message.trim(),
        },
      };

      try {
        const metaRes = await fetch(metaUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metaPayload),
        });

        const metaData = await metaRes.json();
        const duration = Date.now() - startTime;

        if (!metaRes.ok) {
          return NextResponse.json(
            {
              success: false,
              provider: "meta",
              error:
                metaData?.error?.message ||
                `Meta API returned status ${metaRes.status}`,
              details: metaData,
              durationMs: duration,
              clickToChatUrl,
            },
            { status: metaRes.status >= 500 ? 502 : 400 }
          );
        }

        const messageId = metaData?.messages?.[0]?.id || `wamid.${Date.now()}`;
        return NextResponse.json({
          success: true,
          provider: "meta",
          mode: "live",
          messageId,
          phone: cleanPhone,
          recipient: `+91 ${cleanPhone}`,
          customerName: customerName || "Customer",
          message: message.trim(),
          durationMs: duration,
          timestamp: new Date().toISOString(),
          responsePayload: metaData,
          clickToChatUrl,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            provider: "meta",
            error: err?.message || "Failed to connect to Meta WhatsApp Cloud API.",
            durationMs: Date.now() - startTime,
            clickToChatUrl,
          },
          { status: 502 }
        );
      }
    }

    // 2. CUSTOM WEBHOOK / SMS GATEWAY PROVIDER
    if (provider === "custom_webhook") {
      const apiUrl =
        config?.apiUrl?.trim() || process.env.WHATSAPP_WEBHOOK_URL?.trim();

      if (!apiUrl) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing Custom Webhook URL. Please enter the endpoint URL in API configuration.",
          },
          { status: 400 }
        );
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(config?.customHeaders || {}),
        };
        if (config?.apiToken) {
          headers["Authorization"] = `Bearer ${config.apiToken}`;
        }

        const webhookRes = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            phone: cleanPhone,
            full_phone: formattedRecipient,
            customer_name: customerName || "Customer",
            message: message.trim(),
            timestamp: new Date().toISOString(),
          }),
        });

        const webhookData = await webhookRes.json().catch(() => null);
        const duration = Date.now() - startTime;

        if (!webhookRes.ok) {
          return NextResponse.json(
            {
              success: false,
              provider: "custom_webhook",
              error: `Webhook returned HTTP ${webhookRes.status}`,
              details: webhookData,
              durationMs: duration,
              clickToChatUrl,
            },
            { status: 502 }
          );
        }

        return NextResponse.json({
          success: true,
          provider: "custom_webhook",
          mode: "live",
          messageId: webhookData?.id || `msg-${Date.now()}`,
          phone: cleanPhone,
          recipient: `+91 ${cleanPhone}`,
          customerName: customerName || "Customer",
          message: message.trim(),
          durationMs: duration,
          timestamp: new Date().toISOString(),
          responsePayload: webhookData || { status: "accepted" },
          clickToChatUrl,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            provider: "custom_webhook",
            error: err?.message || "Failed to dispatch request to custom webhook.",
            durationMs: Date.now() - startTime,
            clickToChatUrl,
          },
          { status: 502 }
        );
      }
    }

    // 3. MOCK / SANDBOX SIMULATOR (DEFAULT FOR TESTING)
    // Simulates realistic network round-trip and generates valid response structure
    await new Promise((resolve) => setTimeout(resolve, 280));
    const simulatedMsgId = `wamid.HBgMOTE3MjkwODI4NjgwdA${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}AA==`;

    return NextResponse.json({
      success: true,
      provider: "mock",
      mode: "sandbox",
      messageId: simulatedMsgId,
      phone: cleanPhone,
      recipient: `+91 ${cleanPhone}`,
      customerName: customerName || "Customer",
      message: message.trim(),
      charCount: message.trim().length,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      note: "Dispatched in Simulator / Sandbox Mode. Switch to Meta Cloud API or Custom Gateway when your live credentials are ready.",
      responsePayload: {
        messaging_product: "whatsapp",
        contacts: [{ input: formattedRecipient, wa_id: formattedRecipient }],
        messages: [{ id: simulatedMsgId, message_status: "accepted" }],
      },
      clickToChatUrl,
    });
  } catch (error: any) {
    console.error("POST /api/whatsapp/send error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error occurred while sending message.",
      },
      { status: 500 }
    );
  }
}
