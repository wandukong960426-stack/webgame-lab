import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "딴짓모아 소개",
  description: "설치와 회원가입 없이 즐기는 무료 브라우저 게임 공간 딴짓모아를 소개합니다.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About Ddanjitmoa"
      title="쉬는 시간에 바로 한 판"
      lead="딴짓모아는 설치나 게임용 회원가입 없이 PC와 모바일 브라우저에서 바로 즐기는 무료 웹게임 공간입니다."
    >
      <section className="info-section">
        <h2>빠르게 시작하고, 충분히 즐기기</h2>
        <p>
          게임을 고른 뒤 복잡한 절차 없이 바로 플레이할 수 있도록 만들고 있습니다.
          짧은 퍼즐부터 오목·오셀로·체스·장기처럼 오래 고민하는 보드게임까지 한곳에서 제공합니다.
        </p>
      </section>
      <section className="info-section">
        <h2>현재 GitHub 버전에서 제공하는 기능</h2>
        <ul>
          <li>오목, 오셀로, 2048, 틱택토+, 체스, 장기</li>
          <li>AI 대전 또는 같은 기기 2인 플레이</li>
          <li>모바일 전체화면, 효과음·진동, 화면 꺼짐 방지</li>
          <li>2048·오목·오셀로의 브라우저 자동 저장과 이어하기</li>
        </ul>
        <p className="info-callout">
          게임 진행 기록은 별도의 안내가 없는 한 현재 기기의 브라우저에 저장되며,
          다른 기기로 자동 동기화되지 않습니다.
        </p>
      </section>
      <section className="info-section">
        <h2>운영 원칙</h2>
        <ul>
          <li>플레이 가능한 기능과 준비 중인 기능을 구분합니다.</li>
          <li>배포·검증되지 않은 개발 작업을 완료로 표시하지 않습니다.</li>
          <li>게임 조작을 방해하거나 오클릭을 유도하는 광고 배치를 사용하지 않습니다.</li>
          <li>오류 제보와 이용자 피드백을 다음 개발 우선순위에 반영합니다.</li>
        </ul>
      </section>
    </InfoPage>
  );
}
