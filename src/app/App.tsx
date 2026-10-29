import "../styles/fonts.css";
import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppProvider } from "./contexts/AppContext";

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#10192e" }}>
      <div style={{ textAlign: "center" }}>
        <img
          src="/logo.png"
          alt="Deeper Life High School"
          style={{
            width: 56, height: 56, borderRadius: 12,
            margin: "0 auto 16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
            objectFit: "contain",
            display: "block"
          }}
        />
        <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: 15, fontWeight: 800, color: "#ffffff", letterSpacing: "0.02em" }}>
          Deeper Life High School
        </div>
        <div style={{ fontFamily: "'Lato',sans-serif", fontSize: 12, color: "#bfd1ff", marginTop: 4 }}>
          Preparing Academic Portal…
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Suspense fallback={<LoadingScreen />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProvider>
  );
}
