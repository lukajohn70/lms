import "../styles/fonts.css";
import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppProvider } from "./contexts/AppContext";

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#011d2f" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, #219EBC 0%, #FB8500 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
            boxShadow: "0 4px 24px rgba(33,158,188,0.4)",
          }}
        >
          <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 22, color: "#fff" }}>A</span>
        </div>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, color: "#8ECAE6" }}>Loading Aroura Academy…</div>
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
