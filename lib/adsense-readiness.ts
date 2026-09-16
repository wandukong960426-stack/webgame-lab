import {
  ADSENSE_CONSENT_READY,
  ADSENSE_GAME_FOOTER_SLOT,
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SCRIPT_ENABLED,
  ADSENSE_SITE_APPROVED,
  ADSENSE_CLIENT_ID,
} from "@/lib/adsense";

export type MonetizationReadinessItem = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
  owner: "code" | "operator";
};

export function getMonetizationReadiness(): MonetizationReadinessItem[] {
  const paymentProfileReady =
    process.env.ADSENSE_PAYMENT_PROFILE_READY === "true";
  const siteAdded = process.env.ADSENSE_SITE_ADDED === "true";

  return [
    {
      key: "publisher",
      label: "AdSense 게시자 ID",
      ready: true,
      detail: ADSENSE_PUBLISHER_ID,
      owner: "code",
    },
    {
      key: "ads-txt",
      label: "ads.txt 판매자 선언",
      ready: true,
      detail: "/ads.txt에서 게시자 ID를 공개합니다.",
      owner: "code",
    },
    {
      key: "meta",
      label: "사이트 소유권 확인 메타 태그",
      ready: true,
      detail: `google-adsense-account=${ADSENSE_CLIENT_ID}`,
      owner: "code",
    },
    {
      key: "payment",
      label: "지급 프로필",
      ready: paymentProfileReady,
      detail: paymentProfileReady
        ? "운영자가 완료 상태로 표시했습니다."
        : "AdSense에서 계정 유형, 실명과 우편 수령 주소를 입력해야 합니다.",
      owner: "operator",
    },
    {
      key: "site-added",
      label: "AdSense 사이트 목록 등록",
      ready: siteAdded,
      detail: siteAdded
        ? "운영자가 ttanjitmoa.com 등록 상태로 표시했습니다."
        : "AdSense의 사이트 메뉴에서 ttanjitmoa.com을 추가하고 검토를 요청해야 합니다.",
      owner: "operator",
    },
    {
      key: "approval",
      label: "사이트 광고 승인",
      ready: ADSENSE_SITE_APPROVED,
      detail: ADSENSE_SITE_APPROVED
        ? "광고 승인 플래그가 활성화되어 있습니다."
        : "승인 전에는 광고 요청을 보내지 않습니다.",
      owner: "operator",
    },
    {
      key: "consent",
      label: "광고 동의 관리 준비",
      ready: ADSENSE_CONSENT_READY,
      detail: ADSENSE_CONSENT_READY
        ? "동의 관리 준비 플래그가 활성화되어 있습니다."
        : "Google Privacy & messaging 또는 인증 CMP를 설정한 뒤 활성화합니다.",
      owner: "operator",
    },
    {
      key: "slot",
      label: "게임 하단 광고 단위",
      ready: Boolean(ADSENSE_GAME_FOOTER_SLOT),
      detail: ADSENSE_GAME_FOOTER_SLOT
        ? `슬롯 ${ADSENSE_GAME_FOOTER_SLOT}`
        : "승인 후 반응형 디스플레이 광고 단위의 숫자 slot ID를 입력합니다.",
      owner: "operator",
    },
    {
      key: "serving",
      label: "광고 송출",
      ready: ADSENSE_SCRIPT_ENABLED,
      detail: ADSENSE_SCRIPT_ENABLED
        ? "승인·동의·활성화 조건이 모두 충족되어 광고 스크립트를 로드합니다."
        : "승인·동의·활성화 중 하나라도 없으면 광고 스크립트를 로드하지 않습니다.",
      owner: "code",
    },
  ];
}
