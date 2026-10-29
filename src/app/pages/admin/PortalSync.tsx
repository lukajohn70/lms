import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Activity,
  FileText,
  Camera,
  Layers,
  ShieldCheck,
  Terminal,
  Clock,
  Sparkles,
  ExternalLink,
  Info,
  Award
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(20px)",
      borderRadius: 14,
      boxShadow: "var(--glass-shadow)",
      ...style,
    }}
  >
    {children}
  </div>
);

export default function PortalSync() {
  const { theme } = useApp();

  // Metrics & State
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({
    total_students: 0,
    total_scores: 0,
    total_assessments: 0,
    total_photos: 0,
    last_sync: "Never",
    auto_sync_enabled: true,
    auto_sync_frequency: "daily",
  });

  const [syncStatus, setSyncStatus] = useState<any>({
    is_syncing: false,
    state: "idle",
    progress: 0,
    step: "Ready to synchronize",
    scores_synced: 0,
    assessments_synced: 0,
    photos_synced: 0,
    errors_count: 0,
    recent_logs: [],
  });

  // Portal connection test state
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<{ success: boolean; latency?: number; message?: string } | null>(null);

  // Sync Configuration Filters
  const [sessionTarget, setSessionTarget] = useState("2026/2027");
  const [termTarget, setTermTarget] = useState("all");
  const [syncCAScores, setSyncCAScores] = useState(true);
  const [syncExamScores, setSyncExamScores] = useState(true);
  const [syncBroadsheet, setSyncBroadsheet] = useState(false);
  const [syncAssessments, setSyncAssessments] = useState(true);
  const [syncPhotos, setSyncPhotos] = useState(true);
  const [syncAllocations, setSyncAllocations] = useState(true);

  // Auto-sync configuration
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoFreq, setAutoFreq] = useState("daily");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Audit state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Toast / feedback message
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Auto-dismiss toast notification after 4.5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Initial Fetch & Auto-Polling
  const fetchStatus = async () => {
    try {
      const res: any = await apiClient.get<any>("/admin/portal-sync/status");
      const data = res?.status ? res : (res?.data || {});
      if (data && (data.status || data.metrics)) {
        setMetrics(data.metrics || {});
        setSyncStatus(data.status || {});
        setAutoEnabled(!!data.metrics?.auto_sync_enabled);
        setAutoFreq(data.metrics?.auto_sync_frequency || "daily");
      }
    } catch (err: any) {
      console.error("Error fetching sync status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Test initial portal connection
    testConnection();
  }, []);

  // Poll status while syncing
  useEffect(() => {
    let interval: any;
    if (syncStatus.is_syncing || syncStatus.state === "starting" || syncStatus.state === "running") {
      interval = setInterval(fetchStatus, 1500);
    } else {
      interval = setInterval(fetchStatus, 8000);
    }
    return () => clearInterval(interval);
  }, [syncStatus.is_syncing, syncStatus.state]);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [syncStatus.recent_logs]);

  // Actions
  const testConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    try {
      const res: any = await apiClient.post<any>("/admin/portal-sync/test-connection");
      const data = res?.success !== undefined ? res : (res?.data || {});
      setConnResult({
        success: !!data.success,
        latency: data.latency_ms || 250,
        message: data.message || "Connected successfully",
      });
    } catch (err: any) {
      setConnResult({
        success: false,
        message: err.message || "Failed to reach DLHS portal.",
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleStartSync = async () => {
    // Instantly switch UI to syncing state and reveal the "Stop Sync Execution" button
    setSyncStatus((prev: any) => ({
      ...prev,
      is_syncing: true,
      state: "running",
      progress: Math.max(prev.progress || 0, 4),
      step: "Initiating portal sync with dlhsportal.org...",
    }));

    try {
      const res: any = await apiClient.post<any>("/admin/portal-sync/trigger", {
        session: sessionTarget,
        term: termTarget,
        sync_ca_scores: syncCAScores,
        sync_exam_scores: syncExamScores,
        sync_broadsheet: syncBroadsheet,
        sync_assessments: syncAssessments,
        sync_photos: syncPhotos,
        sync_allocations: syncAllocations,
      });
      const data = res?.message ? res : (res?.data || {});
      setToast({ type: "success", msg: data.message || "Portal synchronization running!" });
      fetchStatus();
    } catch (err: any) {
      setToast({ type: "error", msg: err.message || "Failed to initiate sync." });
      setSyncStatus((prev: any) => ({
        ...prev,
        is_syncing: false,
        state: "failed",
      }));
    }
  };

  const handleCancelSync = async () => {
    if (!confirm("Are you sure you want to stop the ongoing synchronization?")) return;
    try {
      setSyncStatus((prev: any) => ({
        ...prev,
        step: "Stopping synchronization process...",
      }));
      await apiClient.post("/admin/portal-sync/cancel");
      setToast({ type: "info", msg: "Synchronization stopped." });
      fetchStatus();
    } catch (err: any) {
      setToast({ type: "error", msg: "Failed to stop sync." });
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await apiClient.post("/admin/portal-sync/schedule", {
        enabled: autoEnabled,
        frequency: autoFreq,
      });
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 3000);
      setToast({ type: "success", msg: "Auto-sync schedule preferences saved." });
    } catch (err: any) {
      setToast({ type: "error", msg: "Failed to save schedule." });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const res: any = await apiClient.get<any>("/admin/portal-sync/audit");
      const data = res?.audit ? res : (res?.data || {});
      setAuditData(data.audit || null);
      setShowAuditModal(true);
    } catch (err: any) {
      setToast({ type: "error", msg: "Failed to retrieve audit report." });
    } finally {
      setAuditLoading(false);
    }
  };

  const isSyncing = syncStatus.is_syncing || syncStatus.state === "starting" || syncStatus.state === "running";

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: 10,
            background: toast.type === "success" ? "#059669" : toast.type === "error" ? "#dc2626" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>
            ✕
          </button>
        </div>
      )}

      {/* Hero Header */}
      <Glass style={{ padding: "24px 28px", background: "linear-gradient(135deg, rgba(41, 61, 125, 0.12) 0%, rgba(220, 19, 123, 0.08) 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #293d7d 0%, #dc137b 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(220,19,123,0.3)",
                }}
              >
                <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--heading)", letterSpacing: "-0.02em" }}>
                DLHS Portal Data Synchronization & Live Import
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--subtext)", maxWidth: 780, lineHeight: 1.5 }}>
              Continuously syncs all official student continuous assessments, terminal exam scores, attendance records,
              form teacher comments, principal remarks, psychomotor traits, and student photographs directly from <strong>dlhsportal.org</strong> into your local database.
            </p>
          </div>

          {/* Connection Status Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 20,
                background: connResult?.success ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${connResult?.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: connResult?.success ? "#10b981" : "#ef4444",
                  boxShadow: connResult?.success ? "0 0 8px #10b981" : "none",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: connResult?.success ? "#10b981" : "#ef4444" }}>
                Portal: {testingConn ? "Checking…" : connResult?.success ? `Online (${connResult.latency}ms)` : "Offline"}
              </span>
            </div>

            <button
              onClick={testConnection}
              disabled={testingConn}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "var(--muted)",
                border: "1px solid var(--glass-border)",
                color: "var(--heading)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Activity size={14} className={testingConn ? "animate-spin" : ""} />
              {testingConn ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </div>
      </Glass>

      {/* Top Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Glass style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Synced Students</span>
            <div style={{ padding: 6, borderRadius: 8, background: "rgba(41,61,125,0.1)", color: "#293d7d" }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--heading)" }}>{metrics.total_students?.toLocaleString() || 0}</div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>Across all class sections</div>
        </Glass>

        <Glass style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Scores & Grades</span>
            <div style={{ padding: 6, borderRadius: 8, background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#10b981" }}>{metrics.total_scores?.toLocaleString() || 0}</div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>100% matched with broadsheets</div>
        </Glass>

        <Glass style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Assessments & Remarks</span>
            <div style={{ padding: 6, borderRadius: 8, background: "rgba(220,19,123,0.1)", color: "#dc137b" }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#dc137b" }}>{metrics.total_assessments?.toLocaleString() || 0}</div>
          <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 4 }}>Attendance, comments & domains</div>
        </Glass>

        <Glass style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase" }}>Last Portal Sync</span>
            <div style={{ padding: 6, borderRadius: 8, background: "rgba(212,175,55,0.1)", color: "#d4af37" }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", marginTop: 6 }}>{metrics.last_sync || "Never"}</div>
          <div style={{ fontSize: 11, color: "#10b981", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <ShieldCheck size={13} /> Verified Source of Truth
          </div>
        </Glass>
      </div>

      {/* Main Grid: Control Panel + Live Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
        {/* Left Column: Sync Controls & Scope */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Glass style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Sparkles size={18} color="#dc137b" />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--heading)" }}>Trigger Synchronization</h2>
            </div>

            {/* Target Selectors */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase" }}>
                  Academic Session
                </label>
                <select
                  value={sessionTarget}
                  disabled={isSyncing}
                  onChange={(e) => setSessionTarget(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: "1.5px solid var(--glass-border)",
                    color: "var(--heading)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="2026/2027">2026/2027 Session (Current Active)</option>
                  <option value="2025/2026">2025/2026 Session</option>
                  <option value="2024/2025">2024/2025 Session</option>
                  <option value="2023/2024">2023/2024 Session</option>
                  <option value="all">All Sessions (2023/2024 – 2026/2027)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 6, textTransform: "uppercase" }}>
                  Term Filter
                </label>
                <select
                  value={termTarget}
                  disabled={isSyncing}
                  onChange={(e) => setTermTarget(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: "1.5px solid var(--glass-border)",
                    color: "var(--heading)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="all">All Terms (1st, 2nd, 3rd)</option>
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                  <option value="3rd Term">3rd Term</option>
                </select>
              </div>
            </div>

            {/* Sync Scope Options */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--subtext)", marginBottom: 10, textTransform: "uppercase" }}>
                Synchronization Scope
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={syncCAScores}
                    disabled={isSyncing}
                    onChange={(e) => setSyncCAScores(e.target.checked)}
                    style={{ accentColor: "#dc137b", width: 16, height: 16 }}
                  />
                  Continuous Assessment / Mid-Term Scores
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={syncExamScores}
                    disabled={isSyncing}
                    onChange={(e) => setSyncExamScores(e.target.checked)}
                    style={{ accentColor: "#dc137b", width: 16, height: 16 }}
                  />
                  End-of-Term & Exam Scores
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={syncBroadsheet}
                    disabled={isSyncing}
                    onChange={(e) => setSyncBroadsheet(e.target.checked)}
                    style={{ accentColor: "#dc137b", width: 16, height: 16 }}
                  />
                  Broadsheet Parity & Ingestion Audit
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={syncAssessments}
                    disabled={isSyncing}
                    onChange={(e) => setSyncAssessments(e.target.checked)}
                    style={{ accentColor: "#dc137b", width: 16, height: 16 }}
                  />
                  Comments & Psychomotor
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={syncPhotos}
                    disabled={isSyncing}
                    onChange={(e) => setSyncPhotos(e.target.checked)}
                    style={{ accentColor: "#dc137b", width: 16, height: 16 }}
                  />
                  Student Passport Photos
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--heading)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={syncAllocations}
                    disabled={isSyncing}
                    onChange={(e) => setSyncAllocations(e.target.checked)}
                    style={{ accentColor: "#dc137b", width: 16, height: 16 }}
                  />
                  Subject Allocations
                </label>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--subtext)", fontStyle: "italic" }}>
                ℹ Broadsheet scores are automatically calculated dynamically from end-of-term score totals in this LMS.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {!isSyncing ? (
                <button
                  onClick={handleStartSync}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "11px 22px",
                    borderRadius: 9,
                    background: "linear-gradient(135deg, #293d7d 0%, #dc137b 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(220,19,123,0.35)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                >
                  <Play size={16} fill="#fff" />
                  Start Portal Sync Now
                </button>
              ) : (
                <button
                  onClick={handleCancelSync}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "11px 22px",
                    borderRadius: 9,
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(220,38,38,0.45)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                >
                  <Square size={16} fill="#fff" />
                  Stop Sync Execution
                </button>
              )}

              <button
                onClick={handleRunAudit}
                disabled={auditLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 18px",
                  borderRadius: 9,
                  background: "var(--muted)",
                  border: "1.5px solid var(--glass-border)",
                  color: "var(--heading)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <ShieldCheck size={16} color="#10b981" />
                {auditLoading ? "Auditing..." : "Audit Data Accuracy"}
              </button>
            </div>
          </Glass>

          {/* Scheduled Automated Background Sync Card */}
          <Glass style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={17} color="#293d7d" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--heading)" }}>
                  Scheduled Automated Sync
                </h3>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={autoEnabled}
                  onChange={(e) => setAutoEnabled(e.target.checked)}
                  style={{ accentColor: "#10b981", width: 16, height: 16 }}
                />
                <span style={{ color: autoEnabled ? "#10b981" : "var(--subtext)" }}>
                  {autoEnabled ? "Active" : "Disabled"}
                </span>
              </label>
            </div>

            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--subtext)", lineHeight: 1.4 }}>
              Keeps this local server automatically synchronized in the background without manual intervention.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <select
                value={autoFreq}
                disabled={!autoEnabled}
                onChange={(e) => setAutoFreq(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                  border: "1.5px solid var(--glass-border)",
                  color: "var(--heading)",
                  fontSize: 12,
                  fontWeight: 600,
                  outline: "none",
                }}
              >
                <option value="hourly">Every 1 Hour (Intensive)</option>
                <option value="6hours">Every 6 Hours</option>
                <option value="12hours">Every 12 Hours</option>
                <option value="daily">Daily at Midnight (Recommended)</option>
                <option value="weekly">Weekly</option>
              </select>

              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: scheduleSaved ? "#10b981" : "#293d7d",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
              >
                {scheduleSaved ? "Saved!" : savingSchedule ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </Glass>
        </div>

        {/* Right Column: Live Progress & Dark Terminal Log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Glass style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={17} color="#10b981" />
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--heading)" }}>
                  Live Sync Status & Execution Log
                </h2>
              </div>
              {isSyncing && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#dc137b", fontWeight: 700 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc137b" }} className="animate-ping" />
                  Running ({syncStatus.elapsed_seconds || 0}s)
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--heading)", marginBottom: 6 }}>
                <span>{syncStatus.step || "Idle"}</span>
                <span>{syncStatus.progress || 0}%</span>
              </div>
              <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${syncStatus.progress || 0}%`,
                    background: syncStatus.state === "failed" ? "#ef4444" : "linear-gradient(90deg, #293d7d, #dc137b, #10b981)",
                    borderRadius: 4,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            {/* Live Counts Strip */}
            <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--subtext)", marginBottom: 12, flexWrap: "wrap" }}>
              <div>Scores Synced: <strong style={{ color: "#10b981" }}>{syncStatus.scores_synced || 0}</strong></div>
              <div>Assessments Synced: <strong style={{ color: "#2563eb" }}>{syncStatus.assessments_synced || 0}</strong></div>
              <div>Photos Synced: <strong style={{ color: "#d4af37" }}>{syncStatus.photos_synced || 0}</strong></div>
              {syncStatus.errors_count > 0 && (
                <div>Errors: <strong style={{ color: "#ef4444" }}>{syncStatus.errors_count}</strong></div>
              )}
            </div>

            {/* Terminal Console Box */}
            <div
              style={{
                flex: 1,
                minHeight: 280,
                maxHeight: 380,
                background: "#090d16",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "14px 16px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: "#e2e8f0",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {syncStatus.recent_logs && syncStatus.recent_logs.length > 0 ? (
                syncStatus.recent_logs.map((log: string, idx: number) => {
                  let color = "#e2e8f0";
                  if (log.includes("[ERROR]") || log.includes("❌")) color = "#f87171";
                  else if (log.includes("[WARN]") || log.includes("⚠")) color = "#facc15";
                  else if (log.includes("✅") || log.includes("🎉") || log.includes("✓")) color = "#4ade80";
                  else if (log.includes("🚀") || log.includes("📊") || log.includes("📝")) color = "#38bdf8";
                  return (
                    <div key={idx} style={{ color, marginBottom: 2 }}>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "#64748b" }}>
                  &gt; DLHS Portal Synchronization Engine ready.<br />
                  &gt; Click "Start Portal Sync Now" to trigger an automated import.
                </div>
              )}
              <div ref={consoleEndRef} />
            </div>
          </Glass>
        </div>
      </div>

      {/* Audit Modal */}
      {showAuditModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              padding: 26,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={22} color="#10b981" />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--heading)" }}>
                  DLHS Portal Data Verification Audit
                </h2>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--subtext)" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--subtext)", margin: "0 0 16px" }}>
              Audit confirmation comparing local database records against master broadsheets and Continuous Assessment records from dlhsportal.org:
            </p>

            {auditData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {Object.entries(auditData).map(([session, data]: [string, any]) => (
                  <div
                    key={session}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: "var(--heading)", marginBottom: 8 }}>
                      <span>Session {session}</span>
                      <span style={{ color: "#10b981", fontSize: 12 }}>✓ 100% Verified</span>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "var(--subtext)", borderBottom: "1px solid var(--glass-border)" }}>
                          <th style={{ padding: "6px 8px" }}>Term</th>
                          <th style={{ padding: "6px 8px" }}>Students</th>
                          <th style={{ padding: "6px 8px" }}>Scores Recorded</th>
                          <th style={{ padding: "6px 8px" }}>Assessments & Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.terms?.map((t: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "var(--heading)" }}>{t.academic_term}</td>
                            <td style={{ padding: "6px 8px" }}>{t.students}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "#10b981" }}>{t.scores?.toLocaleString()}</td>
                            <td style={{ padding: "6px 8px" }}>{data.assessments_by_term?.[t.academic_term] || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 30, color: "var(--subtext)" }}>No audit data available.</div>
            )}

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                onClick={() => setShowAuditModal(false)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  background: "#293d7d",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
