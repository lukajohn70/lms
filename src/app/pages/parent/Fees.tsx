import { useState, useEffect } from "react";
import { Receipt, CheckCircle, AlertTriangle, CreditCard, GraduationCap } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useNavigate } from "react-router";
import { useApp } from "../../contexts/AppContext";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function ParentFees() {
  const navigate = useNavigate();
  const { settings } = useApp();

  const [enrolledChildren, setEnrolledChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);

  // Dynamic fee states
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  const [paying, setPaying] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);

  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingFees, setLoadingFees] = useState(false);

  // 1. Fetch children
  useEffect(() => {
    apiClient.get("/parent/children")
      .then((data: any) => {
        const active = data.active_children || [];
        setEnrolledChildren(active);
        if (active.length > 0) {
          setSelectedChild(active[0]);
        }
      })
      .catch(() => setEnrolledChildren([]))
      .finally(() => setLoadingChildren(false));
  }, []);

  // 2. Fetch fees for selected child
  const fetchFees = () => {
    if (!selectedChild) return;
    setLoadingFees(true);
    apiClient.get(`/parent/fees?student_id=${selectedChild.id}`)
      .then((res: any) => {
        setFeeItems(res.fee_items || []);
        setHistory(res.payment_history || []);
      })
      .catch(err => console.error("Error loading child fees", err))
      .finally(() => setLoadingFees(false));
  };

  useEffect(() => {
    fetchFees();
  }, [selectedChild]);

  const totalOwed = feeItems.reduce((a, f) => a + (f.amount - f.paid), 0);
  const totalPaid = feeItems.reduce((a, f) => a + f.paid, 0);

  const handlePay = (id: number) => {
    const item = feeItems.find(f => f.id === id)!;
    const balance = item.amount - item.paid;
    const amt = Math.min(parseFloat(amount) || 0, balance);
    
    if (amt > 0) {
      apiClient.post("/parent/fees/pay", {
        fee_id: id,
        amount: amt
      })
        .then(() => {
          setSuccess(true);
          setPaying(null);
          setAmount("");
          
          const paymentRef = "PAY-" + Math.floor(100000 + Math.random() * 900000);
          handlePrintReceipt(amt, paymentRef, item.desc, `${selectedChild.first_name} ${selectedChild.last_name}`);
          
          fetchFees();
          
          // Determine if first fee (or minimum fee) is fully paid
          const totalPaidNow = totalPaid + amt;
          if (totalPaidNow >= 85000) {
            setShowPortalModal(true);
          }
          
          setTimeout(() => setSuccess(false), 3000);
        })
        .catch(err => console.error("Error recording payment", err));
    }
  };

  // Print Payment Receipt
  const handlePrintReceipt = (paymentAmount: string | number, paymentRef: string, description: string, studentName: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const sName = settings?.school_name || "Aroura Academy";
    const sAcronym = settings?.school_acronym || "AROURA";
    const sAddress = settings?.school_address || "12 Aroura Close, Victoria Island, Lagos, Nigeria";
    const sPhone = settings?.school_phone || "+234 801 234 5678";
    const sEmail = settings?.school_email || "admissions@aroura.edu.ng";

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${paymentRef}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
            body { font-family: 'Montserrat', sans-serif; background: #f4f6f8; margin: 0; padding: 20px; color: #023047; }
            .receipt { max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.05); position: relative; overflow: hidden; }
            .receipt::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #219EBC; }
            .header { text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #cdd7e0; }
            .logo { width: 50px; height: 50px; margin-bottom: 10px; border-radius: 8px; }
            .school-name { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .school-contact { font-size: 10px; color: #5a7f92; margin-top: 5px; line-height: 1.5; }
            .title { text-align: center; font-size: 16px; font-weight: 800; color: #219EBC; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f4f8; font-size: 13px; }
            .row:last-child { border-bottom: none; }
            .label { color: #5a7f92; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
            .value { font-weight: 700; text-align: right; }
            .total-row { display: flex; justify-content: space-between; padding: 16px 0; margin-top: 10px; border-top: 2px solid #023047; border-bottom: 2px solid #023047; font-size: 16px; font-weight: 800; color: #fb8500; }
            .stamp { text-align: center; margin-top: 30px; font-size: 11px; color: #219EBC; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .stamp-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; border: 2px solid #219EBC; margin-bottom: 8px; font-size: 18px; }
            @media print { body { background: #fff; } .receipt { box-shadow: none; border: 1px solid #cdd7e0; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="${window.location.origin}/logo.png" class="logo" alt="${sName}" onerror="this.style.display='none'" />
              <div class="school-name">${sName}</div>
              <div class="school-contact">${sAddress}<br/>${sPhone} &nbsp;|&nbsp; ${sEmail}</div>
            </div>
            <div class="title">Official Receipt</div>
            <div class="row">
              <span class="label">Date</span>
              <span class="value">${today}</span>
            </div>
            <div class="row">
              <span class="label">Reference No.</span>
              <span class="value" style="font-family: monospace; color: #023047;">${paymentRef}</span>
            </div>
            <div class="row">
              <span class="label">Received From</span>
              <span class="value">${studentName}</span>
            </div>
            <div class="row">
              <span class="label">Description</span>
              <span class="value">${description}</span>
            </div>
            <div class="total-row">
              <span>Amount Paid</span>
              <span>₦${Number(paymentAmount).toLocaleString()}</span>
            </div>
            <div class="stamp">
              <div class="stamp-icon">✓</div><br/>
              Generated Automatically by<br/>${sAcronym} LMS
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loadingChildren) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--subtext)", fontSize: 14 }}>
        Loading...
      </div>
    );
  }

  // Empty state: no enrolled children
  if (enrolledChildren.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Fees & Payments</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Manage school fee payments for your enrolled child</p>
        </div>
        <Glass style={{ padding: "56px 32px", textAlign: "center" }}>
          <Receipt size={52} style={{ color: "#FFB703", marginBottom: 18, opacity: 0.7 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px", color: "var(--heading)" }}>No Enrolled Children Found</h3>
          <p style={{ fontSize: 13.5, color: "var(--subtext)", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.65 }}>
            Fee records and payment history will appear here once your child is enrolled. Please apply for admission or accept an admission offer to access financial records.
          </p>
          <button
            onClick={() => navigate("/parent/admissions")}
            style={{
              padding: "11px 24px", borderRadius: 10,
              background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
              color: "white", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, boxShadow: "0 6px 20px rgba(33,158,188,0.22)"
            }}
          >
            Go to Admissions
          </button>
        </Glass>
      </div>
    );
  }

  const childName = `${selectedChild.first_name || ""} ${selectedChild.last_name || ""}`.trim() || "Your Child";
  const statusConfig = {
    paid: { label: "Cleared", color: "#219EBC", bg: "rgba(33,158,188,0.1)" },
    partial: { label: "Partial", color: "#FFB703", bg: "rgba(255,183,3,0.1)" },
    pending: { label: "Pending", color: "#FB8500", bg: "rgba(251,133,0,0.1)" },
  };

  return (
    <div>
      {/* Student Portal Modal */}
      {showPortalModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(6px)"
        }}>
          <Glass style={{ padding: "32px 24px", maxWidth: 380, textAlign: "center" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", marginBottom: 12 }}>
              🎉 Student Portal Created!
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--subtext)", marginBottom: 20 }}>
              Your child now has access to the student portal. Use it to view grades, schedules, and more.
            </p>
            <button
              onClick={() => { setShowPortalModal(false); navigate("/parent"); }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "#2a9d8f",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(42,157,143,0.3)"
              }}
            >
              Go to Dashboard
            </button>
          </Glass>
        </div>
      )}

      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Fees & Payments</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>{childName} · Financial Account</p>
        </div>
        {enrolledChildren.length > 1 && (
          <select
            value={selectedChild.id}
            onChange={e => setSelectedChild(enrolledChildren.find(c => c.id === parseInt(e.target.value)))}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 12, color: "var(--heading)", outline: "none" }}
          >
            {enrolledChildren.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
        )}
      </div>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", marginBottom: 16 }}>
          <CheckCircle size={14} style={{ color: "#219EBC" }} /><span style={{ fontSize: 12.5, color: "#219EBC" }}>Payment successful! Receipt recorded in history.</span>
        </div>
      )}

      {loadingFees ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Updating account statement...</div>
      ) : feeItems.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>No outstanding or cleared fee invoices for this student.</Glass>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { l: "Total Outstanding", v: `₦${totalOwed.toLocaleString()}`, c: "#FB8500", icon: <AlertTriangle size={15}/> },
              { l: "Total Paid", v: `₦${totalPaid.toLocaleString()}`, c: "#219EBC", icon: <CheckCircle size={15}/> },
              { l: "Next Payment Due", v: feeItems.find(f => f.paid < f.amount)?.due || "No Pending Fees", c: "#FFB703", icon: <Receipt size={15}/> },
            ].map(s => (
              <Glass key={s.l} style={{ padding: "16px 20px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.c, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{s.l}</div>
              </Glass>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }} className="parent-grid-layout">
            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Receipt size={14} style={{ color: "#FFB703" }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Fee Breakdown</span>
              </div>
              {feeItems.map(item => {
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
                      <span style={{ fontSize: 11.5, color: "var(--subtext)" }}>₦{item.paid.toLocaleString()} / ₦{item.amount.toLocaleString()}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: balance > 0 ? "#FB8500" : "#219EBC" }}>
                        {balance > 0 ? `Balance: ₦${balance.toLocaleString()}` : "✓ Cleared"}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--muted)", marginBottom: balance > 0 ? 10 : 0, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${sc.color}88, ${sc.color})` }} />
                    </div>
                    {balance > 0 && (
                      paying === item.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="number" placeholder={`Max ₦${balance.toLocaleString()}`} value={amount} onChange={e => setAmount(e.target.value)}
                            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none" }} />
                          <button onClick={() => handlePay(item.id)} style={{ padding: "8px 16px", borderRadius: 8, background: "#FB8500", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Pay</button>
                          <button onClick={() => setPaying(null)} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 12, color: "var(--subtext)" }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setPaying(item.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(251,133,0,0.1)", border: "1px solid rgba(251,133,0,0.25)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#FB8500" }}>
                          <CreditCard size={13} /> Pay Now
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </Glass>

            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>Payment Ledger History</div>
              <div style={{ padding: "8px 0" }}>
                {history.length > 0 ? (
                  history.map((h: any) => (
                    <div key={h.ref} style={{ padding: "12px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>{h.desc}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#219EBC", display: "flex", alignItems: "center", gap: 6 }}>
                          ₦{h.amount.toLocaleString()}
                          <button onClick={() => handlePrintReceipt(h.amount, h.ref, h.desc, childName)} style={{ background: "none", border: "none", cursor: "pointer", color: "#219EBC", padding: 0 }}>
                            <Receipt size={14} />
                          </button>
                        </span>
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
