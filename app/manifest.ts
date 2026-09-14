import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "딴짓모아",
    short_name: "딴짓모아",
    description: "설치 없이 바로 즐기는 무료 웹게임",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f2",
    theme_color: "#76b947",
    lang: "ko",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
