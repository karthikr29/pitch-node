import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pitchnode - Master Every Sales Conversation",
    short_name: "pitchnode",
    description:
      "Practice live sales calls and pitches against AI opponents. Map every response. Master objections.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F3F3",
    theme_color: "#EC7211",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
