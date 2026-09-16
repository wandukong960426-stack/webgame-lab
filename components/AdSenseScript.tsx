import Script from "next/script";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_SCRIPT_ENABLED,
} from "@/lib/adsense";

export default function AdSenseScript() {
  if (!ADSENSE_SCRIPT_ENABLED) return null;

  return (
    <Script
      id="ddanjitmoa-adsense"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
    />
  );
}
