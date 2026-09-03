import React from "react";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";

export interface PasswordCriteria {
  label: string;
  met: boolean;
}

export interface PasswordStrengthMeterProps {
  password: string;
  confirmPassword?: string;
  showCriteria?: boolean;
  minCharCount?: number;
}

export function evaluatePassword(password: string, minCharCount = 8) {
  const criteria: PasswordCriteria[] = [
    { label: `At least ${minCharCount} characters`, met: password.length >= minCharCount },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$...)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = criteria.filter(c => c.met).length;

  let level: "weak" | "fair" | "good" | "strong" = "weak";
  let color = "#ef4444";
  let label = "Weak";
  let barsFilled = 1;

  if (metCount >= 5) {
    level = "strong";
    color = "#2a9d8f";
    label = "Strong";
    barsFilled = 4;
  } else if (metCount >= 3) {
    level = "good";
    color = "#FFB703";
    label = "Good";
    barsFilled = 3;
  } else if (metCount >= 2) {
    level = "fair";
    color = "#FB8500";
    label = "Fair";
    barsFilled = 2;
  } else {
    level = "weak";
    color = "#ef4444";
    label = "Weak";
    barsFilled = password.length > 0 ? 1 : 0;
  }

  const isValid = metCount >= 4 && password.length >= minCharCount;

  return { criteria, metCount, level, color, label, barsFilled, isValid };
}

export default function PasswordStrengthMeter({
  password,
  confirmPassword,
  showCriteria = true,
  minCharCount = 8,
}: PasswordStrengthMeterProps) {
  if (!password && !confirmPassword) return null;

  const { criteria, color, label, barsFilled } = evaluatePassword(password, minCharCount);
  const showMatch = confirmPassword !== undefined && confirmPassword.length > 0;
  const isMatch = showMatch && confirmPassword === password;

  return (
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Strength Bar & Label */}
      {password.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Password Strength
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color, display: "flex", alignItems: "center", gap: 4 }}>
              {barsFilled >= 4 ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              {label}
            </span>
          </div>

          {/* 4 Segmented Progress Bars */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {[1, 2, 3, 4].map(barIdx => {
              const active = barIdx <= barsFilled;
              return (
                <div
                  key={barIdx}
                  style={{
                    height: 4,
                    borderRadius: 4,
                    background: active ? color : "var(--glass-border)",
                    transition: "all 0.25s ease",
                    boxShadow: active ? `0 0 8px ${color}55` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Criteria Checklist (Realtime feedback) */}
      {showCriteria && password.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(2, 48, 71, 0.08)",
            border: "1px solid var(--glass-border)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 6,
          }}
        >
          {criteria.map((c, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: c.met ? "#2a9d8f" : "var(--subtext)",
                transition: "color 0.2s",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: c.met ? "rgba(42,157,143,0.18)" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${c.met ? "#2a9d8f" : "var(--glass-border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                {c.met ? (
                  <Check size={9} strokeWidth={3} style={{ color: "#2a9d8f" }} />
                ) : (
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--subtext)", opacity: 0.5 }} />
                )}
              </div>
              <span style={{ fontWeight: c.met ? 600 : 400 }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Password Real-time Match */}
      {showMatch && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: isMatch ? "#2a9d8f" : "#ef4444",
            padding: "4px 8px",
            borderRadius: 6,
            background: isMatch ? "rgba(42,157,143,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${isMatch ? "rgba(42,157,143,0.3)" : "rgba(239,68,68,0.3)"}`,
            width: "fit-content",
          }}
        >
          {isMatch ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          <span>{isMatch ? "Passwords match" : "Passwords do not match"}</span>
        </div>
      )}
    </div>
  );
}
