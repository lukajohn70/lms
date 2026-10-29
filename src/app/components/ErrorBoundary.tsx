import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Unexpected Application Error";
  let message = "An error occurred while loading this view. Please try refreshing or return to the main dashboard.";
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Page Not Found (404)";
      message = "The page or view you requested could not be located. It may have moved or the URL might be incorrect.";
    } else {
      title = `Error ${error.status}: ${error.statusText || "Application Error"}`;
      message = error.data?.message || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background, #011627)",
        color: "var(--heading, #e8f4f8)",
        padding: 24,
        fontFamily: "'Lato', sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          padding: "36px 32px",
          borderRadius: 16,
          background: "rgba(1, 29, 47, 0.8)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: status === 404 ? "rgba(212, 175, 55, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${status === 404 ? "rgba(212, 175, 55, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: status === 404 ? "#d4af37" : "#ef4444"
          }}
        >
          <AlertCircle size={28} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px", color: "var(--heading, #e8f4f8)" }}>
          {title}
        </h1>

        <p style={{ fontSize: 13.5, color: "var(--subtext, var(--subtext))", lineHeight: 1.6, margin: "0 0 28px" }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 10,
              background: "rgba(41, 61, 125, 0.08)",
              border: "1px solid rgba(41, 61, 125, 0.2)",
              color: "var(--heading, #e8f4f8)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <RefreshCw size={15} /> Refresh Page
          </button>

          <button
            onClick={() => {
              const savedUser = localStorage.getItem("user");
              if (savedUser) {
                try {
                  const u = JSON.parse(savedUser);
                  if (u.role) {
                    navigate(`/${u.role}`);
                    return;
                  }
                } catch {}
              }
              navigate("/");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              borderRadius: 10,
              background: "#293d7d",
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(41,61,125,0.25)",
              transition: "all 0.2s"
            }}
          >
            <Home size={15} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
