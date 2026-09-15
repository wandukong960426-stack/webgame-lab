import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import {
  CONTACT_EMAIL,
  OPERATOR_NAME,
  SITE_URL,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "서비스 이용 안내",
  description: "딴짓모아 게임 이용, 저장 방식, 책임 범위와 문의 방법을 안내합니다.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms of Use"
      title="서비스 이용 안내"
      lead="딴짓모아의 게임과 저장 기능을 이용하기 전에 알아두면 좋은 내용을 안내합니다."
      updatedAt="2026-09-16"
    >
      <section className="info-section">
        <h2>서비스 내용</h2>
        <p>
          딴짓모아는 브라우저에서 실행되는 무료 캐주얼 게임과 관련 안내를 제공합니다.
          운영 과정에서 게임 규칙, 난이도, 디자인, 저장 방식 또는 제공 범위가 변경될 수 있습니다.
        </p>
      </section>

      <section className="info-section">
        <h2>게임과 저장 기록</h2>
        <ul>
          <li>AI 대전은 사람과 동일한 수준의 최적 플레이를 보장하지 않습니다.</li>
          <li>같은 기기 2인용은 한 화면을 번갈아 사용하는 방식이며 온라인 실시간 대전이 아닙니다.</li>
          <li>2048·오목·오셀로의 진행 기록은 현재 브라우저에 저장될 수 있습니다.</li>
          <li>쿠키·사이트 데이터 삭제, 비공개 모드, 저장 공간 제한 또는 오류로 기록이 사라질 수 있습니다.</li>
          <li>로컬 기록은 서버 계정과 연결되지 않으므로 운영자가 분실 기록을 복원할 수 없습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>이용 시 지켜야 할 사항</h2>
        <ul>
          <li>서비스의 정상 작동을 방해하거나 과도한 자동 요청을 보내지 않습니다.</li>
          <li>관리자 화면, 인증 기능 또는 비공개 경로에 무단으로 접근하지 않습니다.</li>
          <li>서비스 코드·이미지·문구를 관련 권리를 침해하는 방식으로 복제하거나 재배포하지 않습니다.</li>
          <li>오류 제보 과정에서 타인의 개인정보나 불법적인 내용을 전송하지 않습니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>서비스 변경과 책임 범위</h2>
        <p>
          점검, 장애, 호스팅 사업자의 사정, 보안 문제 또는 운영상 필요에 따라 일부 기능이
          일시 중단되거나 변경될 수 있습니다. 서비스는 오락 목적으로 제공되며 게임 결과,
          브라우저 기록 또는 외부 링크 이용으로 발생한 간접 손실을 보증하지 않습니다.
        </p>
        <p>
          다만 운영자의 고의 또는 중대한 과실 등 관련 법령상 배제할 수 없는 책임까지 제한하는
          의미는 아닙니다.
        </p>
      </section>

      <section className="info-section">
        <h2>광고와 외부 서비스</h2>
        <p>
          현재 GitHub 버전에는 Google 광고 스크립트가 포함되어 있지 않습니다. 광고를 도입할 경우
          게임 조작을 방해하거나 오클릭을 유도하지 않도록 구분해 배치하고, 개인정보 안내와 필요한
          동의 절차를 실제 설정에 맞게 갱신합니다.
        </p>
        <p>
          외부 사이트로 이동하는 링크가 제공되는 경우 해당 서비스의 이용조건과 개인정보 안내가 적용됩니다.
        </p>
      </section>

      <section className="info-section">
        <h2>운영자와 문의</h2>
        <dl>
          <dt>서비스</dt>
          <dd>딴짓모아 · {SITE_URL}</dd>
          <dt>운영자</dt>
          <dd>{OPERATOR_NAME}</dd>
          <dt>이메일</dt>
          <dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd>
        </dl>
      </section>
    </InfoPage>
  );
}
