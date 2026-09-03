import { useState, useEffect } from "react";
import { Receipt, CheckCircle, AlertTriangle, CreditCard, Clock } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function Fees() {
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [paying, setPaying] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFees = () => {
    setLoading(true);
    apiClient.get("/student/fees")
      .then((res: any) => {
        setFeeItems(res.fee_items || []);
        setHistory(res.payment_history || []);
      })
      .catch(err => console.error("Error fetching student fees", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const totalOwed = feeItems.reduce((a, f) => a + (f.amount - f.paid), 0);
  const totalPaid = feeItems.reduce((a, f) => a + f.paid, 0);

  const handlePay = (id: number) => {
    const item = feeItems.find(f => f.id === id)!;
    const balance = item.amount - item.paid;
    const payAmt = Math.min(parseFloat(amount) || 0, balance);
    
    if (payAmt > 0) {
      apiClient.post("/student/fees/pay", {
        fee_id: id,
        amount: payAmt
      })
        .then(() => {
          setSuccess(true);
          setPaying(null);
          setAmount("");
          fetchFees();
          setTimeout(() => setSuccess(false), 3000);
        })
        .catch(err => console.error("Error making payment", err));
    }
  };

  const statusConfig = {
    paid: { label: "Paid", color: "#219EBC", bg: "rgba(33,158,188,0.1)" },
    partial: { label: "Partial", color: "#FFB703", bg: "rgba(255,183,3,0.1)" },
    pending: { label: "Pending", color: "#FB8500", bg: "rgba(251,133,0,0.1)" },
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Fees & Payments</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Student Financial Overview</p>
      </div>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 10, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", marginBottom: 16 }}>
          <CheckCircle size={16} style={{ color: "#219EBC" }} />
          <span style={{ fontSize: 13, color: "#219EBC", fontWeight: 500 }}>Payment recorded successfully!</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, color: "var(--subtext)", textAlign: "center" }}>Loading financial ledger...</div>
      ) : (
        <>
          {/* Summary */}
          <div className="responsive-grid-3">
            {[
              { l: "Total Outstanding", v: `₦${totalOwed.toLocaleString()}`, c: "#FB8500", icon: <AlertTriangle size={15}/> },
              { l: "Total Paid", v: `₦${totalPaid.toLocaleString()}`, c: "#219EBC", icon: <CheckCircle size={15}/> },
              { l: "Next Payment Due", v: feeItems.find(f => f.paid < f.amount)?.due || "No Pending Fees", c: "#FFB703", icon: <Clock size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          <div className="responsive-grid-2">
            {/* Fee breakdown */}
            <Glass>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                <Receipt size={15} style={{ color: "#219EBC" }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Fee Breakdown</span>
              </div>
              {feeItems.map((item) => {
                const balance = item.amount - item.paid;
                const pct = item.amount > 0 ? Math.round((item.paid / item.amount) * 100) : 0;
                const sc = statusConfig[item.status as "paid" | "partial" | "pending"] || statusConfig.pending;
                return (
                  <div key={item.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>{item.desc}</div>
                        <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>Due: {item.due}</div>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: sc.color, background: sc.bg, padding: "3px 8px", borderRadius: 6 }}>{sc.label}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--subtext)" }}>Paid: ₦{item.paid.toLocaleString()} / ₦{item.amount.toLocaleString()}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: balance > 0 ? "#FB8500" : "#219EBC" }}>
                        {balance > 0 ? `Balance: ₦${balance.toLocaleString()}` : "Cleared"}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--muted)", marginBottom: balance > 0 ? 10 : 0, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${sc.color}99, ${sc.color})` }} />
                    </div>
                    {balance > 0 && (
                      paying === item.id ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="number" placeholder={`Max ₦${balance.toLocaleString()}`} value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12.5, color: "var(--heading)", outline: "none" }}
                          />
                          <button onClick={() => handlePay(item.id)} style={{ padding: "7px 14px", borderRadius: 8, background: "#FB8500", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff" }}>Pay</button>
                          <button onClick={() => setPaying(null)} style={{ padding: "7px 10px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 12, color: "var(--subtext)" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setPaying(item.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.25)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#FB8500" }}>
                          <CreditCard size={13} /> Make Payment
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </Glass>

            {/* Payment history */}
            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Payment History</div>
              <div style={{ padding: "8px 0" }}>
                {history.length > 0 ? (
                  history.map((h: any) => (
                    <div key={h.ref} style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{h.desc}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#219EBC" }}>₦{h.amount.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10.5, color: "var(--subtext)" }}>{h.date} · {h.method}</span>
                        <span style={{ fontSize: 10, color: "var(--subtext)", fontFamily: "monospace" }}>{h.ref}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--subtext)" }}>No payments recorded yet.</div>
                )}
              </div>
            </Glass>
          </div>
        </>
      )}
    </div>
  );
}
