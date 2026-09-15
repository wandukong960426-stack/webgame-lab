import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "문의 · 오류 제보",
  description: "딴짓모아 게임 오류, 이용 문의와 게임 제안 접수 방법을 안내합니다.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

const subject = encodeURIComponent("[딴짓모아 문의] 게임명 또는 문의 주제");
const body = encodeURIComponent(
  "게임명:\n기기와 브라우저:\n문제가 발생한 화면 주소:\n문제 직전의 조작:\n문의 내용:\n",
);

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="문의 · 오류 제보"
      lead="플레이 중 불편한 점, 고쳐야 할 오류, 추가되면 좋을 게임을 알려주세요."
    >
      <section className="info-section">
        <h2>오류를 제보할 때</h2>
        <p>아래 내용을 함께 보내주시면 원인을 재현하고 수정하는 데 도움이 됩니다.</p>
        <ul>
          <li>게임 이름과 문제가 발생한 화면 주소</li>
          <li>휴대전화·PC 등 사용 기기와 브라우저 이름</li>
          <li>문제가 생기기 직전에 누르거나 움직인 항목</li>
          <li>가능하다면 오류 화면 캡처</li>
        </ul>
        <p className="info-callout">
          비밀번호, 주민등록번호, 신분증, 금융정보 등 민감한 개인정보는 보내지 마세요.
        </p>
      </section>
      <section className="info-section">
        <h2>이메일 문의</h2>
        <p>메일 앱이 열리면 준비된 양식에 내용을 채워 보내주세요.</p>
        <div className="info-contact">
          <a href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}>
            이메일로 문의하기
          </a>
          <code>{CONTACT_EMAIL}</code>
        </div>
      </section>
      <section className="info-section">
        <h2>답변 범위</h2>
        <p>
          게임 오류, 이용 방법, 콘텐츠 제안과 개인정보 처리 문의를 확인합니다.
          브라우저 데이터를 삭제해 사라진 로컬 게임 기록은 운영자가 복원할 수 없습니다.
        </p>
      </section>
    </InfoPage>
  );
}
