import { useNavigate } from "react-router";
import { HelpCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Poppins', sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          padding: "40px 32px",
          borderRadius: 16,
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--glass-shadow)",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: "rgba(251, 133, 0, 0.15)",
            border: "1px solid rgba(251, 133, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "#FB8500"
          }}
        >
          <HelpCircle size={30} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px", color: "var(--heading)" }}>
          Page Not Found
        </h1>

        <p style={{ fontSize: 13.5, color: "var(--subtext)", lineHeight: 1.6, margin: "0 0 28px" }}>
          The link you followed doesn't exist or was moved. Let's get you back to familiar grounds.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              background: "var(--muted)",
              border: "1px solid var(--glass-border)",
              color: "var(--heading)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <ArrowLeft size={15} /> Go Back
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
              background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(33,158,188,0.3)",
              transition: "all 0.2s"
            }}
          >
            <Home size={15} /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
