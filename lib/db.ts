import { Pool } from "pg";
import { gamesCatalog } from "@/lib/game-catalog";

export type Game = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  engine_key: string;
  status: "draft" | "published";
  featured: boolean;
  sort_order: number;
  seo_title: string;
  seo_description: string;
};

const fallback: Game[] = gamesCatalog.map((game, index) => ({
  id: String(index + 1),
  slug: game.slug,
  title: game.title,
  short_description: game.description,
  description: game.longDescription,
  engine_key: game.slug,
  status: "published",
  featured: Boolean(game.featured),
  sort_order: (index + 1) * 10,
  seo_title: `${game.title} 무료 게임`,
  seo_description: game.description,
}));

let pool: Pool | undefined;

function db() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

export async function games(all = false): Promise<Game[]> {
  const connection = db();
  if (!connection) return fallback;
  try {
    const result = await connection.query(
      `select * from games ${all ? "" : "where status='published'"} order by featured desc, sort_order asc, id asc`,
    );
    return result.rows as Game[];
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

export async function saveGame(formData: FormData) {
  const connection = db();
  if (!connection) throw new Error("DATABASE_URL missing");
  const id = String(formData.get("id") || "");
  const status = formData.get("status") === "published" ? "published" : "draft";
  await connection.query(
    `update games
       set title=$1,
           short_description=$2,
           description=$3,
           status=$4,
           featured=$5,
           sort_order=$6,
           seo_title=$7,
           seo_description=$8,
           updated_at=now()
     where id=$9`,
    [
      String(formData.get("title") || ""),
      String(formData.get("short_description") || ""),
      String(formData.get("description") || ""),
      status,
      formData.get("featured") === "on",
      Number(formData.get("sort_order") || 100),
      String(formData.get("seo_title") || ""),
      String(formData.get("seo_description") || ""),
      id,
    ],
  );
}
