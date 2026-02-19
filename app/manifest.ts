import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BiYú",
    short_name: "BiYú",
    description: "Tu dinero claro y bajo control",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8e24aa",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
