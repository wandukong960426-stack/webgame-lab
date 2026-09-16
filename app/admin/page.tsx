import { auth, isAdmin, signOut } from "@/auth";
import MonetizationReadiness from "@/components/MonetizationReadiness";
import { games, saveGame } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!process.env.AUTH_SECRET) redirect("/admin/login");
  const session = await auth();
  if (!isAdmin(session?.user?.email)) redirect("/admin/login");
  const list = await games(true);

  async function save(formData: FormData) {
    "use server";
    const currentSession = await auth();
    if (!isAdmin(currentSession?.user?.email)) throw new Error("Unauthorized");
    await saveGame(formData);
    revalidatePath("/");
    revalidatePath("/games");
    revalidatePath("/admin");
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="admin">
      <div className="adminhead">
        <div>
          <p className="eyebrow">DDANJITMOA CMS</p>
          <h1>운영·수익화 관리</h1>
        </div>
        <form action={logout}><button type="submit">로그아웃</button></form>
      </div>

      <MonetizationReadiness />

      <section className="admin-content-section" aria-labelledby="game-content-title">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">GAME CONTENT</p>
            <h2 id="game-content-title">게임 콘텐츠 관리</h2>
          </div>
          <p>게임 실행 코드는 GitHub에서 관리하고, 이 화면에서는 카드 문구·공개 상태·정렬·SEO 문구를 수정합니다.</p>
        </div>
        {list.map((game) => (
          <form action={save} className="editor" key={game.id}>
            <input type="hidden" name="id" value={game.id} />
            <label>제목<input name="title" defaultValue={game.title} /></label>
            <label>카드 설명<input name="short_description" defaultValue={game.short_description} /></label>
            <label>상세 설명<textarea name="description" defaultValue={game.description} /></label>
            <label>SEO 제목<input name="seo_title" defaultValue={game.seo_title} /></label>
            <label>SEO 설명<input name="seo_description" defaultValue={game.seo_description} /></label>
            <label>순서<input type="number" name="sort_order" defaultValue={game.sort_order} /></label>
            <label>상태
              <select name="status" defaultValue={game.status}>
                <option value="published">공개</option>
                <option value="draft">초안</option>
              </select>
            </label>
            <label className="check"><input type="checkbox" name="featured" defaultChecked={game.featured} /> 추천</label>
            <button type="submit" className="primary">저장</button>
          </form>
        ))}
      </section>
    </div>
  );
}
