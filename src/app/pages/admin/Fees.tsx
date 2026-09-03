import { useState, useEffect, useRef } from "react";
import {
  Search, CheckCircle, AlertTriangle, CreditCard, Plus, X,
  Settings2, FileText, Save, Check, RefreshCw, Info
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";

type FeeRecord = {
  id: number; student: string; class: string; term: string;
  total: number; paid: number; status: string; description: string;
};

type FeeRate = {
  key: string; label: string; description: string; defaultVal: string;
  color: string; icon: string;
};

const FEE_RATES: FeeRate[] = [
  { key: "fee_acceptance", label: "Acceptance Fee", description: "One-time admission acceptance fee for new students", defaultVal: "20000", color: "#FB8500", icon: "🎓" },
  { key: "fee_tuition_nursery", label: "Tuition – Nursery", description: "Per-term school fees for Nursery classes (NUR 1–3)", defaultVal: "75000", color: "#219EBC", icon: "📚" },
  { key: "fee_tuition_primary", label: "Tuition – Primary", description: "Per-term school fees for Primary classes (PRI 1–6)", defaultVal: "95000", color: "#219EBC", icon: "📚" },
  { key: "fee_tuition_secondary", label: "Tuition – Secondary", description: "Per-term school fees for Secondary classes (JSS/SS)", defaultVal: "120000", color: "#219EBC", icon: "📚" },
  { key: "fee_materials_nursery", label: "Materials – Nursery", description: "Books, learning kits and stationery for Nursery students", defaultVal: "18000", color: "#8ECAE6", icon: "📦" },
  { key: "fee_materials_primary", label: "Materials – Primary", description: "Books, learning kits and stationery for Primary students", defaultVal: "22000", color: "#8ECAE6", icon: "📦" },
  { key: "fee_materials_secondary", label: "Materials – Secondary", description: "Books, learning kits and stationery for Secondary students", defaultVal: "28000", color: "#8ECAE6", icon: "📦" },
  { key: "fee_development", label: "Development Levy", description: "Annual school infrastructure and development levy", defaultVal: "15000", color: "#FFB703", icon: "🏗️" },
  { key: "fee_pta", label: "PTA Dues", description: "Parent-Teacher Association annual membership dues", defaultVal: "5000", color: "#2a9d8f", icon: "🤝" },
  { key: "fee_exam_waec", label: "WAEC/NECO Fees", description: "External examination fees (for SS3 students)", defaultVal: "45000", color: "#e76f51", icon: "📝" },
  { key: "fee_uniform", label: "Uniform Fee", description: "School uniform and sports kit package", defaultVal: "12000", color: "#9b5de5", icon: "👕" },
  { key: "fee_feeding", label: "Feeding (Per Term)", description: "Optional school feeding plan (canteen subscription)", defaultVal: "35000", color: "#f15bb5", icon: "🍽️" },
];

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Fees() {
  const [activeTab, setActiveTab] = useState<"ledger" | "rates">("ledger");

  // ─── Ledger state ───────────────────────────────────────────────
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [recording, setRecording] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [newFeeDesc, setNewFeeDesc] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeDueDate, setNewFeeDueDate] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // ─── Fee Rates state ────────────────────────────────────────────
  const [rates, setRates] = useState<Record<string, string>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesSaved, setRatesSaved] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);

  // ─── Ledger helpers ─────────────────────────────────────────────
  const fetchFees = () => {
    setLoading(true);
    apiClient.get(`/admin/fees?search=${search}&status=${filter}`)
      .then((data: any) => setFees(data || []))
      .catch(err => console.error("Error fetching admin fees", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFees(); }, [search, filter]);

  // ─── Fee Rates helpers ──────────────────────────────────────────
  useEffect(() => {
    apiClient.get("/admin/settings")
      .then((res: any) => {
        if (res?.success && res.settings) {
          const s = res.settings;
          const loaded: Record<string, string> = {};
          FEE_RATES.forEach(r => {
            loaded[r.key] = s[r.key] ?? r.defaultVal;
          });
          setRates(loaded);
        }
      })
      .catch(err => console.error("Error loading fee rates", err))
      .finally(() => setRatesLoading(false));
  }, []);

  const handleSaveRates = () => {
    setRatesSaving(true);
    apiClient.post("/admin/settings/save", rates)
      .then(() => {
        setRatesSaved(true);
        setTimeout(() => setRatesSaved(false), 2500);
      })
      .catch(err => console.error("Error saving fee rates", err))
      .finally(() => setRatesSaving(false));
  };

  // ─── Create invoice ─────────────────────────────────────────────
  const openCreateModal = () => {
    setShowCreateModal(true);
    apiClient.get("/users")
      .then((res: any) => {
        const studentsOnly = (res.users || []).filter((u: any) => u.role === "student");
        setStudentsList(studentsOnly);
        if (studentsOnly.length > 0) setSelectedStudentId(studentsOnly[0].id.toString());
      })
      .catch(err => console.error("Error fetching students", err));
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewFeeDesc(""); setNewFeeAmount(""); setNewFeeDueDate("");
  };

  const handleCreateFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !newFeeDesc || !newFeeAmount || !newFeeDueDate) return;
    setCreateLoading(true);
    apiClient.post("/admin/fees/create", {
      student_id: parseInt(selectedStudentId),
      amount: parseFloat(newFeeAmount),
      description: newFeeDesc,
      due_date: newFeeDueDate
    })
      .then(() => { closeCreateModal(); fetchFees(); })
      .catch(err => console.error("Error creating fee invoice", err))
      .finally(() => setCreateLoading(false));
  };

  const recordPayment = (id: number) => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    apiClient.post("/admin/fees/record-payment", { fee_id: id, amount: amt })
      .then(() => { setRecording(null); setAmount(""); fetchFees(); })
      .catch(err => console.error("Error recording payment", err));
  };

  const totalCollected = fees.reduce((a, f) => a + f.paid, 0);
  const totalExpected = fees.reduce((a, f) => a + f.total, 0);
  const outstanding = totalExpected - totalCollected;

  const sc: Record<string, { c: string; bg: string }> = {
    paid: { c: "#219EBC", bg: "rgba(33,158,188,0.1)" },
    partial: { c: "#FFB703", bg: "rgba(255,183,3,0.1)" },
    pending: { c: "#FB8500", bg: "rgba(251,133,0,0.1)" },
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 7,
    padding: "8px 18px", borderRadius: 9, cursor: "pointer",
    background: active ? "rgba(33,158,188,0.14)" : "transparent",
    border: active ? "1px solid rgba(33,158,188,0.4)" : "1px solid transparent",
    color: active ? "#219EBC" : "var(--subtext)",
    fontWeight: active ? 700 : 500, fontSize: 13, transition: "all 0.2s"
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Admin</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>
            {activeTab === "ledger" ? "Fee Management" : "Fee Rate Configuration"}
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>
            {activeTab === "ledger"
              ? "Track and manage all student fee invoices and payments"
              : "Set tuition rates, levies and charges applied to all students"}
          </p>
        </div>
        {activeTab === "ledger" ? (
          <button onClick={openCreateModal} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
            background: "linear-gradient(135deg, #219EBC, #1a8aaa)", border: "none", cursor: "pointer",
            fontSize: 12.5, fontWeight: 700, color: "#fff", boxShadow: "0 4px 12px rgba(33,158,188,0.25)"
          }}>
            <Plus size={14} /> Create Invoice
          </button>
        ) : (
          <button onClick={handleSaveRates} disabled={ratesSaving} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 10,
            background: ratesSaved ? "rgba(42,157,143,0.15)" : "linear-gradient(135deg, #FB8500, #E76F51)",
            border: ratesSaved ? "1px solid #2a9d8f" : "none",
            color: ratesSaved ? "#2a9d8f" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: ratesSaved ? "none" : "0 4px 16px rgba(251,133,0,0.3)", transition: "all 0.3s"
          }}>
            {ratesSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {ratesSaving ? "Saving..." : "Save Rates"}</>}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={tabStyle(activeTab === "ledger")} onClick={() => setActiveTab("ledger")}>
          <FileText size={14} /> Invoices Ledger
        </button>
        <button style={tabStyle(activeTab === "rates")} onClick={() => setActiveTab("rates")}>
          <Settings2 size={14} /> Fee Rates & Charges
        </button>
      </div>

      {/* ───────────────────── LEDGER TAB ───────────────────── */}
      {activeTab === "ledger" && (
        <>
          <div className="responsive-grid-3">
            {[
              { l: "Total Collected", v: `₦${totalCollected.toLocaleString()}`, c: "#219EBC", icon: <CheckCircle size={15} /> },
              { l: "Outstanding Balance", v: `₦${outstanding.toLocaleString()}`, c: "#FB8500", icon: <AlertTriangle size={15} /> },
              { l: "Collection Rate", v: totalExpected > 0 ? `${Math.round((totalCollected / totalExpected) * 100)}%` : "0%", c: "#FFB703", icon: <CreditCard size={15} /> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 20px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          {/* CREATE FEE MODAL */}
          {showCreateModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <Glass style={{ width: 420, padding: 24, position: "relative" }}>
                <button onClick={closeCreateModal} style={{ position: "absolute", right: 16, top: 16, background: "none", border: "none", color: "var(--subtext)", cursor: "pointer" }}>
                  <X size={18} />
                </button>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Create Student Fee Invoice</h3>
                <p style={{ fontSize: 12, color: "var(--subtext)", margin: "0 0 16px" }}>Manually generate a fee invoice for a student outside of the standard billing cycle.</p>
                <form onSubmit={handleCreateFee} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Select Student</label>
                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none" }} required>
                      {studentsList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Fee Description</label>
                    <input type="text" placeholder="e.g. 2nd Term Tuition" value={newFeeDesc} onChange={e => setNewFeeDesc(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none", boxSizing: "border-box" }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Amount (₦)</label>
                    <input type="number" placeholder="e.g. 85000" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none", boxSizing: "border-box" }} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--subtext)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Due Date</label>
                    <input type="date" value={newFeeDueDate} onChange={e => setNewFeeDueDate(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none" }} required />
                  </div>
                  <button type="submit" disabled={createLoading}
                    style={{ width: "100%", marginTop: 8, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg,#219EBC,#1a8aaa)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    {createLoading ? "Creating..." : "Generate Invoice"}
                  </button>
                </form>
              </Glass>
            </div>
          )}

          <Glass>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, padding: "7px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                <Search size={14} style={{ color: "var(--subtext)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                  style={{ border: "none", background: "transparent", fontSize: 13, color: "var(--heading)", outline: "none", flex: 1 }} />
              </div>
              {["all", "paid", "partial", "pending"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 7, border: `1px solid ${filter === f ? "#219EBC" : "var(--glass-border)"}`,
                  background: filter === f ? "rgba(33,158,188,0.12)" : "var(--muted)", cursor: "pointer", fontSize: 11.5,
                  color: filter === f ? "#219EBC" : "var(--subtext)", fontWeight: filter === f ? 700 : 400, textTransform: "capitalize"
                }}>{f}</button>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading invoice statements...</div>
            ) : fees.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>
                <FileText size={28} style={{ color: "var(--subtext)", opacity: 0.4, marginBottom: 8 }} />
                <div>No fee records found. Use "Create Invoice" or enroll a student to auto-generate fees.</div>
              </div>
            ) : (
              fees.map(f => {
                const pct = f.total > 0 ? Math.round((f.paid / f.total) * 100) : 0;
                const balance = f.total - f.paid;
                return (
                  <div key={f.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#219EBC", flexShrink: 0 }}>
                        {f.student.split(" ").map(w => w[0]).join("")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{f.student}</div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: sc[f.status]?.c, background: sc[f.status]?.bg, padding: "2px 8px", borderRadius: 5, textTransform: "capitalize" }}>{f.status}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--subtext)" }}>{f.class} · {f.description} · ₦{f.paid.toLocaleString()} paid of ₦{f.total.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: balance > 0 ? "#FB8500" : "#219EBC" }}>
                          {balance > 0 ? `₦${balance.toLocaleString()} balance` : "CLEARED"}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--subtext)" }}>{pct}% paid</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--muted)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${sc[f.status]?.c}88, ${sc[f.status]?.c})` }} />
                      </div>
                      {balance > 0 && (
                        recording === f.id ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)}
                              style={{ width: 120, padding: "5px 9px", borderRadius: 7, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12, color: "var(--heading)", outline: "none" }} />
                            <button onClick={() => recordPayment(f.id)} style={{ padding: "5px 12px", borderRadius: 7, background: "#219EBC", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#fff" }}>Record</button>
                            <button onClick={() => setRecording(null)} style={{ padding: "5px 9px", borderRadius: 7, background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 12, color: "var(--subtext)" }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setRecording(f.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.2)", cursor: "pointer", fontSize: 11.5, color: "#FB8500", fontWeight: 600 }}>
                            <CreditCard size={12} /> Record Payment
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Glass>
        </>
      )}

      {/* ───────────────────── FEE RATES TAB ───────────────────── */}
      {activeTab === "rates" && (
        <>
          {/* Info Banner */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(33,158,188,0.07)", border: "1px solid rgba(33,158,188,0.2)", marginBottom: 20 }}>
            <Info size={16} style={{ color: "#219EBC", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--heading)" }}>Fee Rate Configuration:</strong> These rates are used as defaults when auto-generating invoices for newly enrolled students. Changes take effect for <em>future</em> invoices only — existing invoices are not retroactively updated.
            </div>
          </div>

          {ratesLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading fee configuration...</div>
          ) : (
            <div className="responsive-grid-2">
              {FEE_RATES.map(rate => (
                <Glass key={rate.key} style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 22 }}>{rate.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>{rate.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 2, lineHeight: 1.5 }}>{rate.description}</div>
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: rate.color }}>₦</span>
                    <input
                      type="number"
                      value={rates[rate.key] ?? rate.defaultVal}
                      onChange={e => setRates(prev => ({ ...prev, [rate.key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "10px 12px 10px 28px", borderRadius: 8,
                        border: `1.5px solid ${rate.color}33`,
                        background: `${rate.color}09`,
                        color: "var(--heading)", fontSize: 14, fontWeight: 700,
                        outline: "none", boxSizing: "border-box",
                        fontFamily: "'Poppins', sans-serif"
                      }}
                      min="0"
                      step="500"
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--subtext)", display: "flex", justifyContent: "space-between" }}>
                    <span>Default: ₦{parseInt(rate.defaultVal).toLocaleString()}</span>
                    {rates[rate.key] && rates[rate.key] !== rate.defaultVal && (
                      <span style={{ color: rate.color, fontWeight: 600 }}>✎ Modified</span>
                    )}
                  </div>
                </Glass>
              ))}
            </div>
          )}

          {/* Sticky save footer summary */}
          {!ratesLoading && (
            <Glass style={{ marginTop: 20, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>Fee Summary — Current Rates</div>
                  <div style={{ fontSize: 11.5, color: "var(--subtext)", marginTop: 3 }}>
                    Nursery total/term: <strong style={{ color: "var(--heading)" }}>₦{(parseInt(rates["fee_tuition_nursery"] || "0") + parseInt(rates["fee_materials_nursery"] || "0")).toLocaleString()}</strong> &nbsp;|&nbsp;
                    Primary: <strong style={{ color: "var(--heading)" }}>₦{(parseInt(rates["fee_tuition_primary"] || "0") + parseInt(rates["fee_materials_primary"] || "0")).toLocaleString()}</strong> &nbsp;|&nbsp;
                    Secondary: <strong style={{ color: "var(--heading)" }}>₦{(parseInt(rates["fee_tuition_secondary"] || "0") + parseInt(rates["fee_materials_secondary"] || "0")).toLocaleString()}</strong>
                  </div>
                </div>
                <button onClick={handleSaveRates} disabled={ratesSaving} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10,
                  background: ratesSaved ? "rgba(42,157,143,0.15)" : "linear-gradient(135deg, #FB8500, #E76F51)",
                  border: ratesSaved ? "1px solid #2a9d8f" : "none",
                  color: ratesSaved ? "#2a9d8f" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: ratesSaved ? "none" : "0 4px 12px rgba(251,133,0,0.3)", transition: "all 0.3s"
                }}>
                  {ratesSaved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {ratesSaving ? "Saving..." : "Save All Rates"}</>}
                </button>
              </div>
            </Glass>
          )}
        </>
      )}
    </div>
  );
}
