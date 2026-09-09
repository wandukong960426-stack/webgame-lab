import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata:Metadata={title:"딴짓모아 - 설치 없이 바로 하는 웹게임",description:"오목부터 퍼즐까지 회원가입 없이 바로 즐기는 무료 웹게임"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body><header><Link href="/" className="brand"><b>딴</b>딴짓모아</Link><nav><Link href="/games/omok">오목</Link></nav></header><main>{children}</main><footer>© 2026 Ddanjitmoa</footer></body></html>}
