import Link from "next/link";
import type { ReactNode } from "react";

type InfoPageProps = {
  eyebrow: string;
  title: string;
  lead: string;
  updatedAt?: string;
  children: ReactNode;
};

export default function InfoPage({
  eyebrow,
  title,
  lead,
  updatedAt,
  children,
}: InfoPageProps) {
  return (
    <article className="info-page">
      <Link className="info-page__back" href="/">
        <span aria-hidden="true">←</span> 홈으로 돌아가기
      </Link>
      <header className="info-page__hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{lead}</p>
        {updatedAt ? <time dateTime={updatedAt}>마지막 확인: {updatedAt}</time> : null}
      </header>
      <div className="info-page__body">{children}</div>
    </article>
  );
}
