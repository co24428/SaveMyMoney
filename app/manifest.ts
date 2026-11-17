import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SaveMyMoney",
    short_name: "SaveMyMoney",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f1",
    theme_color: "#2a78d6",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
