import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ConvoSparr: Master Every Sales Conversation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #232F3E 0%, #16191F 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#EC7211",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "white",
            }}
          >
            C
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#EC7211",
            }}
          >
            ConvoSparr
          </span>
        </div>
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "24px",
          }}
        >
          Master Every Sales Conversation
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#D5DBDB",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
          }}
        >
          Practice real sales conversations against AI opponents. Master every pitch, call, and close.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "60px",
            fontSize: "20px",
            color: "#EC7211",
            fontWeight: 600,
          }}
        >
          convosparr.com
        </div>
      </div>
    ),
    { ...size }
  );
}
