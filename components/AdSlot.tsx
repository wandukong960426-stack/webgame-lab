"use client";

import { useEffect, useRef } from "react";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_SCRIPT_ENABLED,
} from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

type AdSlotProps = {
  slot: string;
  placement: string;
  className?: string;
};

export default function AdSlot({ slot, placement, className = "" }: AdSlotProps) {
  const requested = useRef(false);
  const ready = ADSENSE_SCRIPT_ENABLED && Boolean(slot);

  useEffect(() => {
    if (!ready || requested.current) return;
    requested.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      requested.current = false;
    }
  }, [ready, slot]);

  if (!ready) return null;

  return (
    <aside
      className={`ad-slot ${className}`.trim()}
      data-ad-placement={placement}
      aria-label="광고"
    >
      <span className="ad-slot__label">광고</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
