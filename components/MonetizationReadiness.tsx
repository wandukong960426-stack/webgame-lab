import Link from "next/link";
import { getMonetizationReadiness } from "@/lib/adsense-readiness";
import { SITE_URL } from "@/lib/site-config";

export default function MonetizationReadiness() {
  const items = getMonetizationReadiness();
  const readyCount = items.filter((item) => item.ready).length;
  const operatorPending = items.filter(
    (item) => item.owner === "operator" && !item.ready,
  );

  return (
    <section className="monetization-readiness" aria-labelledby="monetization-title">
      <div className="monetization-readiness__heading">
        <div>
          <p className="eyebrow">REVENUE READINESS</p>
          <h2 id="monetization-title">AdSense 수익화 준비</h2>
          <p>
            코드 준비와 운영자 직접 완료 항목을 분리합니다. 공식 도메인에서 확인되기 전에는
            광고 송출 완료로 간주하지 않습니다.
          </p>
        </div>
        <div className="monetization-score" aria-label={`${items.length}개 중 ${readyCount}개 준비됨`}>
          <strong>{readyCount}/{items.length}</strong>
          <span>준비됨</span>
        </div>
      </div>

      <div className="monetization-grid">
        {items.map((item) => (
          <article
            className={`monetization-item ${item.ready ? "is-ready" : "is-pending"}`}
            key={item.key}
          >
            <span className="monetization-item__status" aria-hidden="true">
              {item.ready ? "✓" : "!"}
            </span>
            <div>
              <div className="monetization-item__title">
                <strong>{item.label}</strong>
                <small>{item.owner === "code" ? "코드" : "운영자"}</small>
              </div>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="monetization-actions">
        <div>
          <h3>지금 직접 완료할 항목</h3>
          {operatorPending.length ? (
            <ol>
              {operatorPending.map((item) => <li key={item.key}>{item.label}: {item.detail}</li>)}
            </ol>
          ) : (
            <p>운영자 표시 기준으로 남은 수동 항목이 없습니다.</p>
          )}
        </div>
        <div className="monetization-links">
          <a href={`${SITE_URL}/ads.txt`} target="_blank" rel="noreferrer">ads.txt 확인</a>
          <a href={`${SITE_URL}/api/release`} target="_blank" rel="noreferrer">배포 커밋 확인</a>
          <Link href="/privacy">개인정보 안내</Link>
          <Link href="/terms">이용 안내</Link>
        </div>
      </div>

      <details className="monetization-env">
        <summary>승인 이후 환경변수 설정 순서</summary>
        <pre>{`ADSENSE_PAYMENT_PROFILE_READY=true
ADSENSE_SITE_ADDED=true
NEXT_PUBLIC_ADSENSE_SITE_APPROVED=true
NEXT_PUBLIC_ADSENSE_CONSENT_READY=true
NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=<숫자 슬롯 ID>
NEXT_PUBLIC_ADSENSE_ENABLED=true`}</pre>
        <p>
          마지막 활성화 값은 반드시 지급 프로필, 사이트 승인, 동의 관리와 광고 단위 준비를
          확인한 뒤 입력합니다.
        </p>
      </details>
    </section>
  );
}
