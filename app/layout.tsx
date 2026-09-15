import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE_URL } from "@/lib/site-config";
import { GameAudioProvider } from "@/components/GameShell";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "딴짓모아 - 설치 없이 바로 하는 무료 웹게임",
    template: "%s | 딴짓모아",
  },
  description:
    "오목, 오셀로, 2048, 틱택토, 체스, 장기를 설치와 회원가입 없이 PC·모바일에서 바로 즐기세요.",
  applicationName: "딴짓모아",
  category: "games",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "딴짓모아",
    title: "딴짓모아 - 설치 없이 바로 하는 무료 웹게임",
    description: "잠깐의 쉬는 시간을 채우는 무료 브라우저 게임 모음",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "딴짓모아",
    description: "설치 없이 바로 하는 무료 웹게임",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f2",
};

function PeaLogo() {
  return (
    <span className="pea-logo" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">본문으로 바로가기</a>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="딴짓모아 홈">
            <PeaLogo />
            <span>딴짓모아</span>
          </Link>
          <nav aria-label="주요 메뉴">
            <Link href="/games">전체 게임</Link>
            <Link className="header-play" href="/games/omok">빠른 한 판</Link>
          </nav>
        </header>
        <GameAudioProvider><main id="main-content">{children}</main></GameAudioProvider>
        <footer className="site-footer">
          <div>
            <Link href="/" className="brand brand--footer">
              <PeaLogo />
              <span>딴짓모아</span>
            </Link>
            <p>해야 할 일은 잠깐. 딴짓은 지금.</p>
          </div>
          <div>
            <nav className="footer-links" aria-label="서비스 안내">
              <Link href="/games">게임 목록</Link>
              <Link href="/about">소개</Link>
              <Link href="/contact">문의</Link>
              <Link href="/privacy">개인정보 안내</Link>
              <Link href="/terms">이용 안내</Link>
            </nav>
            <span>© 2026 Ddanjitmoa</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
