"use client";

import React, { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QrCodeImageProps {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
}

export function QrCodeImage({
  value,
  size = 64,
  alt = "QR Code",
  className = "",
}: QrCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate data URL from rendered canvas for 100% reliable printing across all printers and browsers
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current.querySelector("canvas");
        if (canvas) {
          try {
            const url = canvas.toDataURL("image/png");
            setDataUrl(url);
          } catch {
            // fallback
          }
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [value, size]);

  return (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      {/* Hidden offscreen canvas to generate pure PNG image */}
      <div ref={canvasRef} style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <QRCodeCanvas
          value={value}
          size={size * 2} // 2x resolution for crisp high-DPI thermal printing
          level="M"
          fgColor="#000000"
          bgColor="#ffffff"
          includeMargin={true}
        />
      </div>

      {/* Render crisp PNG img tag which can NEVER be turned into a black box by CSS */}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={alt}
          width={size}
          height={size}
          style={{
            display: "block",
            width: `${size}px`,
            height: `${size}px`,
            maxWidth: "100%",
            backgroundColor: "#ffffff",
            border: "1px solid #000000",
            borderRadius: "2px",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: "#ffffff",
            border: "1px solid #000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QRCodeCanvas
            value={value}
            size={size}
            level="M"
            fgColor="#000000"
            bgColor="#ffffff"
            includeMargin={true}
          />
        </div>
      )}
    </div>
  );
}
