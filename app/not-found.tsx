import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <span>404</span>
      <h1>이 딴짓은 아직 준비 중입니다.</h1>
      <p>게임 목록에서 지금 바로 할 수 있는 다른 한 판을 골라보세요.</p>
      <Link className="button button--primary" href="/games">게임 목록으로</Link>
    </section>
  );
}
