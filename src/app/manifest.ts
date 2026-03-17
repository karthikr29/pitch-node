import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ConvoSparr — Master Every Sales Conversation",
    short_name: "ConvoSparr",
    description: "Practice real sales conversations against AI opponents before the real meeting happens.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F3F3",
    theme_color: "#EC7211",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
