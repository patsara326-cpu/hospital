"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    // Keep the detailed error in server/client logs without exposing it to patients.
    console.error("Unhandled application error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <html lang="th">
      <head>
        <title>เกิดข้อผิดพลาด | ระบบผู้ป่วยจิตเวช</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f1f5f9",
          color: "#0f172a",
          fontFamily: '"Sarabun", "Segoe UI", sans-serif',
        }}
      >
        <main
          aria-labelledby="global-error-title"
          style={{
            width: "min(92vw, 30rem)",
            padding: "2rem",
            border: "1px solid #cbd5e1",
            borderRadius: "1rem",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>ระบบขัดข้อง</p>
          <h1 id="global-error-title" style={{ margin: "0.5rem 0", fontSize: "1.5rem" }}>
            ไม่สามารถแสดงหน้านี้ได้
          </h1>
          <p style={{ margin: "0 0 1.5rem", color: "#475569" }}>
            กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้แจ้งผู้ดูแลระบบ
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              border: 0,
              borderRadius: "0.75rem",
              padding: "0.7rem 1.25rem",
              background: "#4f46e5",
              color: "#ffffff",
              cursor: "pointer",
              font: "inherit",
              fontWeight: 700,
            }}
          >
            ลองใหม่
          </button>
        </main>
      </body>
    </html>
  );
}
