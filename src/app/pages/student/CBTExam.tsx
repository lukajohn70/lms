import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Clock, ChevronRight, ChevronLeft, CheckCircle, Zap, AlertTriangle, Flag, Lock } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const EXAMS = [
  {
    id: 1, subject: "Physics", title: "Intro to Quantum Mechanics",
    duration: 60, totalQ: 10, date: "Jun 13, 2026",
    questions: [
      { q: "What is the principle of superposition in quantum mechanics?", opts: ["A wave can exist in multiple states simultaneously until observed", "Two forces can act on a particle at the same time", "Energy is always conserved in a system", "Particles always follow a defined path"], ans: 0 },
      { q: "Which equation describes the time evolution of a quantum state?", opts: ["Einstein field equations", "Schrödinger equation", "Maxwell equations", "Dirac equation"], ans: 1 },
      { q: "What is wave-particle duality?", opts: ["All matter has wave properties only", "Light behaves only as a particle", "Quantum entities exhibit both wave and particle properties", "Electrons have no mass"], ans: 2 },
      { q: "Planck's constant (h) has units of:", opts: ["kg·m/s", "J·s", "m/s²", "eV/K"], ans: 1 },
      { q: "The Heisenberg Uncertainty Principle states that:", opts: ["All measurements are perfect", "Position and momentum cannot both be known precisely simultaneously", "Energy is quantized in all systems", "Light always travels at c"], ans: 1 },
      { q: "What does the Born rule relate to?", opts: ["Energy levels of an atom", "The probability of finding a particle at a location", "The spin of an electron", "Wave polarization"], ans: 1 },
      { q: "Quantum entanglement means:", opts: ["Two particles are physically connected", "Particles can be correlated regardless of distance", "Electrons orbit nuclei in pairs", "Photons have mass"], ans: 1 },
      { q: "The photoelectric effect was explained by:", opts: ["Newton", "Maxwell", "Einstein", "Bohr"], ans: 2 },
      { q: "De Broglie wavelength depends on:", opts: ["Temperature only", "Momentum of the particle", "Electric charge", "Nuclear spin"], ans: 1 },
      { q: "A quantum number that cannot take a negative value:", opts: ["Magnetic quantum number", "Spin quantum number", "Principal quantum number", "Azimuthal quantum number"], ans: 2 },
    ],
  },
  { id: 2, subject: "CS", title: "SQL Database Design", duration: 45, totalQ: 5, date: "Jun 15, 2026", questions: [] },
  { id: 3, subject: "Maths", title: "Further Calculus — Integration", duration: 90, totalQ: 5, date: "Jun 17, 2026", questions: [] },
];

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

function ExamRunner({ exam, onFinish }: { exam: typeof EXAMS[0]; onFinish: (score: number, answers: Record<number, number>) => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = () => {
    const score = exam.questions.reduce((acc, q, i) => acc + (answers[i] === q.ans ? 1 : 0), 0);
    onFinish(score, answers);
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const q = exam.questions[current];
  const pct = Math.round((Object.keys(answers).length / exam.questions.length) * 100);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 18, height: "calc(100vh - 120px)" }}>
      {/* Main question area */}
      <Glass style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--glass-border)" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 2 }}>{exam.subject} · {exam.title}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Question {current + 1} of {exam.questions.length}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 9, background: timeLeft < 300 ? "rgba(255,183,3,0.12)" : "rgba(33,158,188,0.1)", border: `1px solid ${timeLeft < 300 ? "rgba(255,183,3,0.3)" : "rgba(33,158,188,0.25)"}` }}>
            <Clock size={14} style={{ color: timeLeft < 300 ? "#FFB703" : "#219EBC" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: timeLeft < 300 ? "#FFB703" : "#219EBC", fontVariantNumeric: "tabular-nums" }}>
              {mins}:{secs}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: "var(--muted)" }}>
          <div style={{ height: "100%", width: `${(current / exam.questions.length) * 100}%`, background: "linear-gradient(90deg, #219EBC, #8ECAE6)", transition: "width 0.3s" }} />
        </div>

        {/* Question */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--heading)", lineHeight: 1.55, marginBottom: 24 }}>
            {current + 1}. {q.question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.opts.map((opt, i) => {
              const selected = answers[current] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((p) => ({ ...p, [current]: i }))}
                  style={{
                    padding: "13px 16px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
                    background: selected ? "rgba(33,158,188,0.15)" : "var(--muted)",
                    border: selected ? "1.5px solid #219EBC" : "1.5px solid var(--glass-border)",
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    border: selected ? "2px solid #219EBC" : "2px solid var(--glass-border)",
                    background: selected ? "#219EBC" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 13.5, color: selected ? "var(--heading)" : "var(--subtext)", fontWeight: selected ? 600 : 400 }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--glass-border)" }}>
          <button
            onClick={() => setCurrent((p) => Math.max(0, p - 1))}
            disabled={current === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid var(--glass-border)", background: "var(--muted)", cursor: current === 0 ? "not-allowed" : "pointer", opacity: current === 0 ? 0.4 : 1, fontSize: 13, color: "var(--heading)" }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => { const s = flagged; s.has(current) ? s.delete(current) : s.add(current); setFlagged(new Set(s)); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 9, border: `1px solid ${flagged.has(current) ? "#FFB703" : "var(--glass-border)"}`, background: flagged.has(current) ? "rgba(255,183,3,0.1)" : "transparent", cursor: "pointer", fontSize: 12, color: flagged.has(current) ? "#FFB703" : "var(--subtext)" }}
          >
            <Flag size={13} /> {flagged.has(current) ? "Flagged" : "Flag"}
          </button>
          {current < exam.questions.length - 1 ? (
            <button
              onClick={() => setCurrent((p) => p + 1)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "#219EBC", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff" }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, background: "linear-gradient(135deg,#FB8500,#e67600)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", boxShadow: "0 4px 14px rgba(251,133,0,0.3)" }}
            >
              Submit <CheckCircle size={14} />
            </button>
          )}
        </div>
      </Glass>

      {/* Sidebar panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Glass style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Question Map</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 14 }}>
            {exam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  height: 32, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: current === i ? "2px solid #219EBC" : "1px solid var(--glass-border)",
                  background: answers[i] !== undefined ? "rgba(33,158,188,0.2)" : flagged.has(i) ? "rgba(255,183,3,0.15)" : "var(--muted)",
                  color: answers[i] !== undefined ? "#219EBC" : flagged.has(i) ? "#FFB703" : "var(--subtext)",
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[["rgba(33,158,188,0.2)","Answered"], ["rgba(255,183,3,0.15)","Flagged"], ["var(--muted)","Not visited"]].map(([bg, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: "1px solid var(--glass-border)", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--subtext)" }}>{label}</span>
              </div>
            ))}
          </div>
        </Glass>

        <Glass style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "var(--subtext)" }}>Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#219EBC" }}>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--muted)", marginBottom: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#219EBC,#8ECAE6)", borderRadius: 3, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center", padding: "8px", borderRadius: 8, background: "rgba(33,158,188,0.08)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#219EBC" }}>{Object.keys(answers).length}</div>
              <div style={{ fontSize: 9, color: "var(--subtext)" }}>Answered</div>
            </div>
            <div style={{ textAlign: "center", padding: "8px", borderRadius: 8, background: "rgba(255,183,3,0.08)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#FFB703" }}>{exam.questions.length - Object.keys(answers).length}</div>
              <div style={{ fontSize: 9, color: "var(--subtext)" }}>Remaining</div>
            </div>
          </div>
          {Object.keys(answers).length < exam.questions.length && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, padding: "7px", borderRadius: 8, background: "rgba(255,183,3,0.07)", border: "1px solid rgba(255,183,3,0.2)" }}>
              <AlertTriangle size={11} style={{ color: "#FFB703" }} />
              <span style={{ fontSize: 10, color: "#FFB703" }}>{exam.questions.length - Object.keys(answers).length} unanswered</span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            style={{ marginTop: 12, width: "100%", padding: "10px", borderRadius: 9, background: "linear-gradient(135deg,#FB8500,#e67600)", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#fff", boxShadow: "0 4px 12px rgba(251,133,0,0.3)" }}
          >
            Submit Exam
          </button>
        </Glass>
      </div>
    </div>
  );
}

function ResultScreen({ exam, score, total, answers, onRetry, onBack }: { exam: typeof EXAMS[0]; score: number; total: number; answers: Record<number, number>; onRetry: () => void; onBack: () => void }) {
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 70 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : "F";
  const color = pct >= 70 ? "#219EBC" : pct >= 50 ? "#FFB703" : "#FB8500";
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <Glass style={{ padding: "32px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${color}18`, border: `3px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 800, color }}>{grade}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: "0 0 6px" }}>Exam Submitted!</h2>
        <p style={{ fontSize: 13, color: "var(--subtext)", margin: "0 0 20px" }}>{exam.title}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          {[["Score", `${score}/${total}`, "#219EBC"], ["Percentage", `${pct}%`, color], ["Grade", grade, color]].map(([l,v,c]) => (
            <div key={l} style={{ padding: 16, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onBack} style={{ padding: "10px 20px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)", cursor: "pointer", fontSize: 13, color: "var(--heading)" }}>Back to Exams</button>
          <button onClick={onRetry} style={{ padding: "10px 24px", borderRadius: 9, background: "linear-gradient(135deg,#FB8500,#e67600)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", boxShadow: "0 4px 12px rgba(251,133,0,0.3)" }}>Review Answers</button>
        </div>
      </Glass>

      {/* Answer review */}
      <Glass>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", fontSize: 13, fontWeight: 600, color: "var(--heading)" }}>Answer Review</div>
        <div style={{ padding: "8px 0" }}>
          {exam.questions.map((q, i) => {
            const chosen = answers[i];
            const correct = chosen === q.ans;
            return (
              <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: correct ? "rgba(33,158,188,0.15)" : "rgba(251,133,0,0.15)", border: `1.5px solid ${correct ? "#219EBC" : "#FB8500"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: correct ? "#219EBC" : "#FB8500" }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: "var(--heading)", marginBottom: 6, lineHeight: 1.45 }}>{q.question}</div>
                  <div style={{ fontSize: 11.5, color: correct ? "#219EBC" : "#FB8500" }}>
                    Your answer: {q.opts[chosen] ?? "Not answered"}
                  </div>
                  {!correct && <div style={{ fontSize: 11.5, color: "#8ECAE6", marginTop: 2 }}>Correct: {q.opts[q.ans]}</div>}
                </div>
                <CheckCircle size={16} style={{ color: correct ? "#219EBC" : "#FB8500", flexShrink: 0, marginTop: 2 }} />
              </div>
            );
          })}
        </div>
      </Glass>
    </div>
  );
}

export default function CBTExam() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ score: number; answers: Record<number, number> } | null>(null);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get("/student/courses");
      setCourses(data || []);
      setIsEnrolled(data && data.length > 0);
    } catch (e) {
      console.error("Failed to fetch enrolled courses for exams", e);
    } finally {
      setLoading(false);
    }
  };

  const subjectMatch = (examSubject: string) => {
    return courses.some(c => {
      const name = c.name.toLowerCase();
      const sub = examSubject.toLowerCase();
      return name.includes(sub) || sub.includes(name) || (sub === "cs" && name.includes("computer"));
    });
  };

  const filteredExams = EXAMS.filter(e => subjectMatch(e.subject));

  if (loading) {
    return <div style={{ padding: 40, color: "var(--subtext)" }}>Loading exams...</div>;
  }

  if (!isEnrolled) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Glass style={{ padding: "40px 30px", maxWidth: 460, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(251,133,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={30} style={{ color: "#FB8500" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 10px" }}>CBT Exams Locked</h2>
          <p style={{ fontSize: 13, color: "var(--subtext)", lineHeight: 1.6, margin: "0 0 24px" }}>
            You are not currently registered or enrolled in any courses. Please complete your academic term course enrollment to access your assigned CBT exams.
          </p>
          <Link
            to="/student/courses"
            style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #219EBC, #1a8aaa)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(33,158,188,0.25)" }}
          >
            Go to Course Registration
          </Link>
        </Glass>
      </div>
    );
  }

  if (running && selected !== null && result === null) {
    const exam = EXAMS[selected];
    if (!exam.questions.length) {
      return (
        <Glass style={{ padding: 40, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
          <AlertTriangle size={40} style={{ color: "#FFB703", margin: "0 auto 12px", display: "block" }} />
          <h3 style={{ color: "var(--heading)", margin: "0 0 8px" }}>Exam Not Yet Available</h3>
          <p style={{ color: "var(--subtext)", fontSize: 13, margin: "0 0 16px" }}>This exam's questions haven't been released yet.</p>
          <button onClick={() => setRunning(false)} style={{ padding: "9px 20px", borderRadius: 9, background: "#219EBC", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#fff" }}>Go Back</button>
        </Glass>
      );
    }
    return <ExamRunner exam={exam} onFinish={(score, answers) => { setResult({ score, answers }); setRunning(false); }} />;
  }

  if (result !== null && selected !== null) {
    return <ResultScreen exam={EXAMS[selected]} score={result.score} total={EXAMS[selected].questions.length} answers={result.answers} onRetry={() => setResult(null)} onBack={() => { setResult(null); setSelected(null); }} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>CBT Test Center</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Select an exam below to begin. Ensure you're in a quiet environment.</p>
      </div>
      
      {filteredExams.length === 0 ? (
        <Glass style={{ padding: "40px 20px", textAlign: "center", color: "var(--subtext)" }}>
          <AlertTriangle size={40} style={{ opacity: 0.3, marginBottom: 12, display: "inline" }} />
          <div style={{ fontSize: 14 }}>No exams are currently assigned for your enrolled subjects.</div>
        </Glass>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filteredExams.map((e) => {
            // Find global index in EXAMS array
            const originalIndex = EXAMS.findIndex(exam => exam.id === e.id);
            return (
              <Glass key={e.id} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ height: 5, background: e.id === 1 ? "linear-gradient(90deg,#219EBC,#8ECAE6)" : e.id === 2 ? "linear-gradient(90deg,#FFB703,#FB8500)" : "rgba(142,202,230,0.3)" }} />
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 4 }}>{e.subject}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)", marginBottom: 12, lineHeight: 1.4 }}>{e.title}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {[["Duration", `${e.duration} min`], ["Questions", String(e.totalQ)], ["Date", e.date]].map(([l,v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "var(--subtext)" }}>{l}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--heading)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setSelected(originalIndex); setRunning(true); setResult(null); }}
                    style={{
                      width: "100%", padding: "10px", borderRadius: 9,
                      background: e.id === 1 ? "linear-gradient(135deg,#FB8500,#e67600)" : "rgba(33,158,188,0.12)",
                      border: e.id === 1 ? "none" : "1px solid rgba(33,158,188,0.25)",
                      cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                      color: e.id === 1 ? "#fff" : "#219EBC",
                      boxShadow: e.id === 1 ? "0 4px 12px rgba(251,133,0,0.3)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Zap size={13} /> {e.id === 1 ? "START CBT NOW" : "Start Exam"}
                  </button>
                </div>
              </Glass>
            );
          })}
        </div>
      )}
    </div>
  );
}
