const DEFAULT_PUBLISHER_ID = "pub-1704306174088540";
const PUBLISHER_ID_PATTERN = /^pub-\d{16}$/;
const AD_SLOT_PATTERN = /^\d+$/;

function getPublisherId() {
  const configured = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID?.trim();
  const publisherId = configured || DEFAULT_PUBLISHER_ID;

  if (!PUBLISHER_ID_PATTERN.test(publisherId)) {
    throw new Error(
      `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID must look like pub-1234567890123456. Received: ${publisherId}`,
    );
  }

  return publisherId;
}

function validateAdSlot(value: string, name: string) {
  if (value && !AD_SLOT_PATTERN.test(value)) {
    throw new Error(`${name} must contain only the numeric AdSense ad unit slot ID.`);
  }
  return value;
}

export const ADSENSE_PUBLISHER_ID = getPublisherId();
export const ADSENSE_CLIENT_ID = `ca-${ADSENSE_PUBLISHER_ID}`;
export const ADSENSE_ADS_TXT_LINE =
  `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0`;

export const ADSENSE_SITE_APPROVED =
  process.env.NEXT_PUBLIC_ADSENSE_SITE_APPROVED === "true";
export const ADSENSE_CONSENT_READY =
  process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY === "true";
export const ADSENSE_SCRIPT_REQUESTED =
  process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
export const ADSENSE_SCRIPT_ENABLED =
  ADSENSE_SCRIPT_REQUESTED && ADSENSE_SITE_APPROVED && ADSENSE_CONSENT_READY;

export const ADSENSE_GAME_FOOTER_SLOT = validateAdSlot(
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER?.trim() ?? "",
  "NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER",
);
