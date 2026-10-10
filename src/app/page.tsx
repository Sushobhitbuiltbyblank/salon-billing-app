"use client";

import React, { useState, useEffect } from "react";
import SalonPOSApp from "@/components/SalonPOSApp";
import SpinPage from "./spin/page";

export default function Home() {
  const [isOffersDomain, setIsOffersDomain] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname || "";
      if (
        hostname.includes("belezia-offers") ||
        hostname.includes("offers.belezia") ||
        window.location.search.includes("view=offers_only")
      ) {
        setIsOffersDomain(true);
      }
    }
  }, []);

  if (isOffersDomain) {
    return <SpinPage />;
  }

  return <SalonPOSApp />;
}
