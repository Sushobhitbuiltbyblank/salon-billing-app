import React, { useState } from "react";
import { Customer, SalonSettings } from "@/types";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Share2,
  Copy,
  Download,
  Check,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  Heart,
} from "lucide-react";
import { normalizePhoneNumber } from "@/lib/customerUtils";

interface CustomerOfferModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  settings: SalonSettings;
}

const RAKSHA_BANDHAN_IMAGE_URL = "/offers/raksha-bandhan-offer.jpg";

export function CustomerOfferModal({
  customer,
  isOpen,
  onClose,
  settings,
}: CustomerOfferModalProps) {
  const [includeText, setIncludeText] = useState(true);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const salonName = settings.salon_name || "Belezia Salon";
  const customerName = customer?.name || "Valued Client";

  // Pre-filled Raksha Bandhan promotional copy
  const [customText, setCustomText] = useState(() => {
    return `🌸 *Happy Raksha Bandhan from ${salonName}!* 🌸\n\nDear ${customerName},\nCelebrate the cherished bond of love & togetherness this festive season with our exclusive salon treat! ✨\n\n🎁 *SPECIAL RAKSHA BANDHAN OFFER:* 🎁\n💅 *Bring your siblings and get FREE NAIL PAINT for both hands!* 💅\n\n📅 *Offer Valid Till:* 31st August 2026\n📍 *Location:* ${salonName}\n\nCall or WhatsApp us to book your pampering appointment today! 💖`;
  });

  // Keep text updated when customer changes
  React.useEffect(() => {
    if (customer) {
      setCustomText(
        `🌸 *Happy Raksha Bandhan from ${salonName}!* 🌸\n\nDear ${customer.name || "Valued Client"},\nCelebrate the cherished bond of love & togetherness this festive season with our exclusive salon treat! ✨\n\n🎁 *SPECIAL RAKSHA BANDHAN OFFER:* 🎁\n💅 *Bring your siblings and get FREE NAIL PAINT for both hands!* 💅\n\n📅 *Offer Valid Till:* 31st August 2026\n📍 *Location:* ${salonName}\n\nCall or WhatsApp us to book your pampering appointment today! 💖`
      );
    }
  }, [customer, salonName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Convert image to PNG Blob for clipboard or Web Share API
  const getImageBlob = async (asPng = true): Promise<Blob | null> => {
    try {
      const response = await fetch(RAKSHA_BANDHAN_IMAGE_URL);
      const originalBlob = await response.blob();

      if (!asPng) return originalBlob;

      // Draw onto canvas to guarantee valid image/png for navigator.clipboard.write
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(originalBlob);
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob || originalBlob);
          }, "image/png");
        };
        img.onerror = () => resolve(originalBlob);
        img.src = RAKSHA_BANDHAN_IMAGE_URL;
      });
    } catch (err) {
      console.error("Failed to load offer image blob:", err);
      return null;
    }
  };

  // 1. Copy Image to Clipboard
  const handleCopyImage = async () => {
    try {
      setIsProcessing(true);
      const blob = await getImageBlob(true);
      if (blob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 3000);
        showToast("📋 Offer image copied to clipboard!");
      } else {
        // Fallback: Download
        handleDownloadImage();
        showToast("📥 Image downloaded to your device!");
      }
    } catch (err) {
      console.error("Copy image error:", err);
      handleDownloadImage();
      showToast("📥 Image downloaded to your device!");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Copy Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
      showToast("📋 Text message copied to clipboard!");
    } catch (err) {
      console.error("Copy text error:", err);
    }
  };

  // 3. Download Image
  const handleDownloadImage = () => {
    const link = document.createElement("a");
    link.href = RAKSHA_BANDHAN_IMAGE_URL;
    link.download = `Belezia_Raksha_Bandhan_Offer.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Main Send on WhatsApp Action (Direct WhatsApp Chat matching Reminder behavior)
  const handleSendWhatsApp = async () => {
    if (!customer) return;
    setIsProcessing(true);

    const cleanPhone = normalizePhoneNumber(customer.phone);
    const textToSend = includeText ? customText.trim() : "";

    try {
      // 1. Copy offer image to clipboard for instant pasting (Ctrl+V / Cmd+V / Tap Paste)
      const pngBlob = await getImageBlob(true);
      if (pngBlob && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 3000);
        } catch (clipErr) {
          console.warn("Clipboard write skipped:", clipErr);
        }
      }

      // 2. Open Direct WhatsApp Chat with the customer (Identical to WhatsApp Reminder URL format)
      const waUrl = cleanPhone
        ? textToSend
          ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(textToSend)}`
          : `https://wa.me/91${cleanPhone}`
        : `https://wa.me/?text=${encodeURIComponent(textToSend)}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");

      showToast("✓ WhatsApp opened! Press Ctrl+V (or Paste) to attach the offer photo.");
    } catch (err) {
      console.error("WhatsApp share error:", err);
      // Fallback
      if (cleanPhone) {
        window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(textToSend)}`, "_blank");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} maxWidth="xl">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-600/30">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-1.5">
              <span>Send Raksha Bandhan Offer</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </DialogTitle>
            <p className="text-xs text-zinc-400">
              Sending to: <span className="font-semibold text-white">{customer.name}</span> (
              <span className="font-mono text-purple-300">{customer.phone}</span>)
            </p>
          </div>
        </div>
      </DialogHeader>

      {/* TOAST ALERT NOTIFICATION */}
      {toastMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="space-y-4 my-2 max-h-[70vh] overflow-y-auto pr-1">
        {/* FESTIVE PROMOTIONAL BANNER PREVIEW */}
        <div className="relative rounded-2xl overflow-hidden border border-rose-500/30 bg-zinc-950 shadow-2xl group">
          <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] bg-zinc-900 flex items-center justify-center overflow-hidden">
            <img
              src={RAKSHA_BANDHAN_IMAGE_URL}
              alt="Raksha Bandhan Special Offer"
              className="w-full h-full object-cover sm:object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />

            {/* FLOATING OFFER TAGS */}
            <div className="absolute top-2.5 left-2.5 bg-rose-950/80 backdrop-blur-md border border-rose-500/50 text-rose-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
              <Gift className="h-3 w-3 text-amber-300" />
              <span>Festive Offer</span>
            </div>

            <div className="absolute top-2.5 right-2.5 bg-zinc-950/80 backdrop-blur-md border border-zinc-700 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
              <Calendar className="h-3 w-3 text-amber-400" />
              <span>Valid till 31-Aug-2026</span>
            </div>
          </div>

          <div className="p-3 bg-gradient-to-b from-zinc-900/90 to-zinc-950 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1">
                <span>Free Nail Paint for Both Hands</span>
                <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />
              </h4>
              <p className="text-[11px] text-zinc-400">
                Bring your siblings & enjoy complimentary nail paint on both hands.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyImage}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold flex items-center gap-1 transition-all border border-zinc-700 cursor-pointer"
                title="Copy offer image to clipboard"
              >
                {copiedImage ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all border border-zinc-700 cursor-pointer"
                title="Download offer image"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* MESSAGE & TEXT OPTIONS TOGGLE */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeText}
                onChange={(e) => setIncludeText(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-purple-600 focus:ring-purple-500 bg-zinc-950 cursor-pointer"
              />
              <span>Include WhatsApp Wish & Offer Text Message</span>
            </label>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              includeText
                ? "bg-purple-950/80 text-purple-300 border border-purple-500/30"
                : "bg-zinc-800 text-zinc-400"
            }`}>
              {includeText ? "Text + Image Mode" : "Image Only Mode"}
            </span>
          </div>

          {includeText && (
            <div className="space-y-2 pt-2 border-t border-zinc-800/80 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                  <span>Personalized WhatsApp Message:</span>
                </span>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedText ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedText ? "Copied" : "Copy Text"}</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type your WhatsApp festive offer text..."
                className="w-full p-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans leading-relaxed resize-none"
              />

              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                <span>
                  On WhatsApp Web (Desktop), clicking <b>Send on WhatsApp</b> copies the image to your clipboard and opens the chat. Just press <b>Ctrl+V</b> (or <b>Cmd+V</b>) to send the image!
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 w-full">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto text-xs">
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleCopyImage}
              className="flex items-center justify-center gap-1.5 text-xs w-full sm:w-auto"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Image</span>
            </Button>

            <Button
              onClick={handleSendWhatsApp}
              disabled={isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
            >
              <MessageSquare className="h-4 w-4 text-emerald-200" />
              <span>
                {includeText ? "Send Offer on WhatsApp" : "Send Image Only on WhatsApp"}
              </span>
            </Button>
          </div>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
