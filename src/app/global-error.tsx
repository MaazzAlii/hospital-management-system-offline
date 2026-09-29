"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Application Error | Life Care HMS</title>
      </head>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            maxWidth: "560px",
            width: "90%",
            margin: "24px auto",
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "28px" }}>⚠️</span>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#f87171",
                margin: 0,
              }}
            >
              Something went wrong
            </h1>
          </div>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#cbd5e1",
              margin: "0 0 16px 0",
            }}
          >
            An unexpected application error occurred while processing your request. Please try
            reloading the page. If the issue persists, contact technical support with the reference code
            below.
          </p>

          {error?.message && (
            <div
              style={{
                backgroundColor: "#090d16",
                border: "1px solid #273549",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#fca5a5",
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                wordBreak: "break-all",
              }}
            >
              {error.message}
            </div>
          )}

          {error?.digest && (
            <div
              style={{
                fontSize: "12px",
                color: "#94a3b8",
                marginBottom: "20px",
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              }}
            >
              Error Digest: <strong style={{ color: "#e2e8f0" }}>{error.digest}</strong>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => ((e.target as HTMLElement).style.backgroundColor = "#1d4ed8")}
              onMouseOut={(e) => ((e.target as HTMLElement).style.backgroundColor = "#2563eb")}
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                backgroundColor: "#334155",
                color: "#e2e8f0",
                fontWeight: 600,
                fontSize: "14px",
                border: "1px solid #475569",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => ((e.target as HTMLElement).style.backgroundColor = "#475569")}
              onMouseOut={(e) => ((e.target as HTMLElement).style.backgroundColor = "#334155")}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
