import { useState, useRef } from "react";
import { Plus, Trash2, Save, CheckCircle, ClipboardList, Download, Upload, AlertCircle } from "lucide-react";

type Question = { text: string; opts: string[]; correct: number };

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const Input = ({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 13px", borderRadius: 9, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
  </div>
);

export default function CBTCreate() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [cls, setCls] = useState("");
  const [duration, setDuration] = useState("60");
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", opts: ["", "", "", ""], correct: 0 },
  ]);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // CSV Template & Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState("");

  const handleDownloadQuestionsTemplate = () => {
    const headers = ["question", "option_a", "option_b", "option_c", "option_d", "correct_option"];
    const rows = [
      ["What is the SI unit of electric current?", "Volt", "Ampere", "Ohm", "Watt", "B"],
      ["Which gas is most abundant in the Earth atmosphere?", "Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen", "C"],
      ["Solve for x: 2x + 6 = 14", "2", "3", "4", "5", "C"],
      ["Who wrote the novel 'Things Fall Apart'?", "Wole Soyinka", "Chinua Achebe", "Chimamanda Adichie", "Ngugi wa Thiong'o", "B"]
    ];

    const csvContent = "\uFEFF" + [
      "# Aroura Academy CBT Question Bank Template",
      "# correct_option can be A, B, C, or D (or 1, 2, 3, 4)",
      headers.join(","),
      ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cbt_questions_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportQuestionsCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (!text) throw new Error("Empty CSV file");

        const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("#"));
        if (lines.length < 2) throw new Error("CSV file contains no question rows");

        const parseLine = (line: string) => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result.map(s => s.replace(/^["']|["']$/g, "").trim());
        };

        const headerLine = lines[0];
        const headers = parseLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

        const findCol = (keys: string[]) => {
          for (const k of keys) {
            const idx = headers.findIndex(h => h.includes(k));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const qIdx = findCol(["question", "text", "qtext"]);
        const aIdx = findCol(["optiona", "opta", "a"]);
        const bIdx = findCol(["optionb", "optb", "b"]);
        const cIdx = findCol(["optionc", "optc", "c"]);
        const dIdx = findCol(["optiond", "optd", "d"]);
        const ansIdx = findCol(["correctoption", "correct", "answer", "ans"]);

        if (qIdx === -1 || aIdx === -1 || bIdx === -1) {
          throw new Error("CSV must include columns for question, option_a, option_b, option_c, option_d, and correct_option.");
        }

        const newQuestions: Question[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = parseLine(lines[i]);
          const qText = row[qIdx] || "";
          if (!qText) continue;

          const optA = row[aIdx] || "";
          const optB = row[bIdx] || "";
          const optC = (cIdx !== -1 && row[cIdx]) ? row[cIdx] : "";
          const optD = (dIdx !== -1 && row[dIdx]) ? row[dIdx] : "";

          const rawAns = (ansIdx !== -1 && row[ansIdx]) ? row[ansIdx].toUpperCase() : "A";
          let correctIdx = 0;
          if (rawAns === "B" || rawAns === "2") {
            correctIdx = 1;
          } else if (rawAns === "C" || rawAns === "3") {
            correctIdx = 2;
          } else if (rawAns === "D" || rawAns === "4") {
            correctIdx = 3;
          }

          newQuestions.push({
            text: qText,
            opts: [optA, optB, optC, optD],
            correct: correctIdx
          });
        }

        if (newQuestions.length === 0) {
          throw new Error("No valid questions could be extracted from this CSV.");
        }

        setQuestions(prev => {
          if (prev.length === 1 && !prev[0].text && prev[0].opts.every(o => !o)) {
            return newQuestions;
          }
          return [...prev, ...newQuestions];
        });

        setCsvMessage(`Successfully imported ${newQuestions.length} question(s) from CSV!`);
        setCsvError("");
        setTimeout(() => setCsvMessage(""), 6000);
      } catch (err: any) {
        setCsvError(err.message || "Failed to parse CSV file.");
        setCsvMessage("");
        setTimeout(() => setCsvError(""), 6000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const addQ = () => setQuestions(p => [...p, { text: "", opts: ["", "", "", ""], correct: 0 }]);
  const removeQ = (i: number) => setQuestions(p => p.filter((_, idx) => idx !== i));
  const updateQ = (i: number, field: string, val: string | number) => {
    setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  };
  const updateOpt = (qi: number, oi: number, val: string) => {
    setQuestions(p => p.map((q, idx) => idx === qi ? { ...q, opts: q.opts.map((o, oidx) => oidx === oi ? val : o) } : q));
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const handleSubmit = () => { setSubmitted(true); };

  if (submitted) {
    return (
      <Glass style={{ padding: 48, textAlign: "center", maxWidth: 480, margin: "40px auto" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(33,158,188,0.15)", border: "2px solid #219EBC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={32} style={{ color: "#219EBC" }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 8px" }}>CBT Submitted for Approval</h2>
        <p style={{ fontSize: 13, color: "var(--subtext)", margin: "0 0 24px", lineHeight: 1.55 }}>
          Your CBT "{title || "Untitled"}" with {questions.length} questions has been submitted to the HOD for review and approval.
        </p>
        <button onClick={() => { setSubmitted(false); setTitle(""); setSubject(""); setCls(""); setQuestions([{ text: "", opts: ["", "", "", ""], correct: 0 }]); }}
          style={{ padding: "10px 24px", borderRadius: 9, background: "#219EBC", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff" }}>
          Create Another CBT
        </button>
      </Glass>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Create CBT</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Build a computer-based test for your students</p>
        </div>

        {/* CSV Template & Import Buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleDownloadQuestionsTemplate}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 8, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.3)",
              cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#219EBC"
            }}
          >
            <Download size={13} /> Questions Template (.csv)
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportQuestionsCsv}
            accept=".csv"
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 8, background: "linear-gradient(135deg, #FB8500, #E76F51)", border: "none",
              cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#fff",
              boxShadow: "0 4px 12px rgba(251,133,0,0.25)"
            }}
          >
            <Upload size={13} /> Import Questions (.csv)
          </button>
        </div>
      </div>

      {csvMessage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(42,157,143,0.12)", border: "1px solid rgba(42,157,143,0.3)", color: "#2a9d8f", marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
          <CheckCircle size={15} style={{ flexShrink: 0 }} />
          <span>{csvMessage}</span>
        </div>
      )}
      {csvError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(231,111,81,0.12)", border: "1px solid rgba(231,111,81,0.3)", color: "#e76f51", marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{csvError}</span>
        </div>
      )}

      {saved && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", marginBottom: 16 }}>
          <CheckCircle size={14} style={{ color: "#219EBC" }} />
          <span style={{ fontSize: 12.5, color: "#219EBC" }}>Draft saved!</span>
        </div>
      )}

      <div className="cbt-layout" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
        {/* Questions panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {questions.map((q, qi) => (
            <Glass key={qi}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--glass-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(33,158,188,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#219EBC" }}>{qi + 1}</div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--heading)" }}>Question {qi + 1}</span>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQ(qi)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FB8500" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase" }}>Question Text</label>
                  <textarea value={q.text} onChange={e => updateQ(qi, "text", e.target.value)} placeholder="Enter question here…" rows={2}
                    style={{ width: "100%", padding: "9px 13px", borderRadius: 9, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none", resize: "vertical", fontFamily: "'Poppins',sans-serif", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>Answer Options <span style={{ color: "#219EBC", fontWeight: 400 }}>(click radio to mark correct)</span></div>
                {q.opts.map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <button onClick={() => updateQ(qi, "correct", oi)}
                      style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `2px solid ${q.correct === oi ? "#219EBC" : "var(--glass-border)"}`, background: q.correct === oi ? "#219EBC" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {q.correct === oi && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                    </button>
                    <input value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      style={{ flex: 1, padding: "7px 11px", borderRadius: 8, border: `1px solid ${q.correct === oi ? "rgba(33,158,188,0.4)" : "var(--glass-border)"}`, background: q.correct === oi ? "rgba(33,158,188,0.06)" : "var(--muted)", fontSize: 12.5, color: "var(--heading)", outline: "none" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtext)", width: 16, textAlign: "center" }}>{String.fromCharCode(65 + oi)}</span>
                  </div>
                ))}
              </div>
            </Glass>
          ))}

          <button onClick={addQ}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "2px dashed var(--glass-border)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#219EBC" }}>
            <Plus size={16} /> Add Question
          </button>
        </div>

        {/* Settings sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Glass style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <ClipboardList size={14} style={{ color: "#FFB703" }} /> Exam Settings
            </div>
            <Input label="Exam Title" value={title} onChange={setTitle} placeholder="e.g. Quantum Mechanics Test 2" />
            <Input label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Physics" />
            <Input label="Target Class" value={cls} onChange={setCls} placeholder="e.g. SS2A, SS2B" />
            <Input label="Duration (minutes)" value={duration} onChange={setDuration} type="number" />
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,183,3,0.08)", border: "1px solid rgba(255,183,3,0.2)", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#FFB703", fontWeight: 600 }}>{questions.length} questions added</div>
              <div style={{ fontSize: 10.5, color: "var(--subtext)", marginTop: 2 }}>Requires HOD approval before students can take it</div>
            </div>
          </Glass>

          <button onClick={handleSave}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#219EBC" }}>
            <Save size={14} /> Save Draft
          </button>
          <button onClick={handleSubmit}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, background: "linear-gradient(135deg,#FB8500,#e67600)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", boxShadow: "0 4px 14px rgba(251,133,0,0.3)" }}>
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
