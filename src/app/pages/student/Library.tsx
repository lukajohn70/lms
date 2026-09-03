import { useState, useEffect } from "react";
import { Library, Search, BookOpen, Download, HelpCircle, MessageCircle, ChevronDown, ChevronUp, FileText, ExternalLink, Book, GraduationCap } from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

const FAQS = [
  { q: "How do I take a Computer Based Test (CBT)?", a: "Navigate to 'Academics & CBT' > 'Test Center (CBT)' in the sidebar. If there is an active exam scheduled for your class, click 'Start Exam'. Your timer will count down automatically and your answers are saved as you go." },
  { q: "Where can I view my term results?", a: "Go to the 'Results & Transcripts' page. Select the session and term from the dropdown to view your compiled grade sheet. Click 'Print Report Card' to download a PDF transcript." },
  { q: "How do I access the study guide PDF?", a: "Click on the 'Study Guide' tab above the book shelf. The guide for your school level (Nursery, Primary, or Secondary) can be opened directly in the browser or downloaded." },
  { q: "What should I do if a score is incorrect?", a: "Contact your subject teacher through the 'Communication' portal and describe the issue. If unresolved, submit a support ticket via the Help & Support button at the bottom of the sidebar." },
  { q: "How do I pay my school fees?", a: "Go to 'Fees & Payments' in the sidebar. Click 'Make Payment' next to the outstanding fee invoice, enter the amount, and confirm. A receipt is generated automatically." },
  { q: "Can I download lecture notes?", a: "Yes. Navigate to 'Lesson Materials' under 'Academics & CBT'. PDFs, slides, and documents uploaded by your teachers are listed there for download." },
];

const GUIDE_BASES = [
  { key: "nursery", label: "Nursery Curriculum Guide", emoji: "🐣", desc: "NUR 1–3 complete curriculum, learning objectives and weekly schedule", color: "#FFB703" },
  { key: "primary", label: "Primary Curriculum Guide", emoji: "📖", desc: "PRI 1–6 complete curriculum, NERDC-aligned topics per term", color: "#219EBC" },
  { key: "secondary", label: "Secondary Curriculum Guide", emoji: "🎓", desc: "JSS1–SS3 complete curriculum, WAEC/NECO exam readiness guide", color: "#9b5de5" },
];

export default function StudentLibrary() {
  const { user } = useApp();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"library" | "guides">("library");

  const [guideStatuses, setGuideStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchBooks();
    checkGuides();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { books } = await apiClient.get("/library/books");
      setBooks(books || []);
    } catch (e) {
      console.error("Failed to load library books", e);
    } finally {
      setLoading(false);
    }
  };

  const checkGuides = async () => {
    const baseUrl = API_BASE_URL.replace("/index.php", "");
    const checks: Record<string, boolean> = {};
    await Promise.all(
      GUIDE_BASES.map(async g => {
        const url = `${baseUrl}/public/study_guides/${g.key}_guide.pdf`;
        try {
          const r = await fetch(url, { method: "HEAD" });
          checks[g.key] = r.ok;
        } catch {
          checks[g.key] = false;
        }
      })
    );
    setGuideStatuses(checks);
  };

  // Extract unique subjects from uploaded books
  const subjects = ["All", ...Array.from(new Set(books.map(b => b.category).filter(Boolean)))];

  const filtered = books.filter(b => {
    const matchesSubject = subjectFilter === "All" || b.category === subjectFilter;
    const matchesSearch = search === "" ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(search.toLowerCase())) ||
      (b.category && b.category.toLowerCase().includes(search.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9,
    cursor: "pointer", border: active ? "1px solid rgba(33,158,188,0.4)" : "1px solid transparent",
    background: active ? "rgba(33,158,188,0.14)" : "transparent",
    color: active ? "#219EBC" : "var(--subtext)", fontWeight: active ? 700 : 500, fontSize: 13, transition: "all 0.2s"
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#219EBC", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Resources</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--heading)", margin: 0 }}>Library & Helpdesk</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "4px 0 0" }}>Browse the digital library, download study guides, and get answers to common questions</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button style={tabStyle(activeView === "library")} onClick={() => setActiveView("library")}>
          <BookOpen size={14} /> Digital Library
        </button>
        <button style={tabStyle(activeView === "guides")} onClick={() => setActiveView("guides")}>
          <GraduationCap size={14} /> Study Guides
        </button>
      </div>

      {/* ── LIBRARY VIEW ── */}
      {activeView === "library" && (
        <div className="responsive-grid-2" style={{ gap: 18 }}>
          <div>
            {/* Search + filter */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <Glass style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <Search size={14} style={{ color: "var(--subtext)", flexShrink: 0 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, author, or subject…"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--heading)", fontSize: 13 }} />
              </Glass>
            </div>

            {/* Subject filters */}
            {subjects.length > 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {subjects.map(s => (
                  <button key={s} onClick={() => setSubjectFilter(s)} style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11.5, cursor: "pointer", transition: "all 0.15s",
                    border: subjectFilter === s ? "1px solid #219EBC" : "1px solid var(--glass-border)",
                    background: subjectFilter === s ? "rgba(33,158,188,0.15)" : "var(--muted)",
                    color: subjectFilter === s ? "#219EBC" : "var(--subtext)", fontWeight: subjectFilter === s ? 700 : 400
                  }}>{s}</button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 12 }}>
              Showing <strong style={{ color: "var(--heading)" }}>{filtered.length}</strong> of {books.length} resources
            </div>

            {loading ? (
              <div style={{ color: "var(--subtext)", fontSize: 13 }}>Loading library resources...</div>
            ) : filtered.length === 0 ? (
              <Glass style={{ padding: "60px 24px", textAlign: "center" }}>
                <BookOpen size={40} style={{ color: "var(--subtext)", opacity: 0.3, marginBottom: 12, display: "inline" }} />
                <div style={{ fontSize: 14, color: "var(--subtext)" }}>No books found in the E-Library.</div>
                <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 4 }}>Admin-uploaded resources will appear here.</div>
              </Glass>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {filtered.map(book => {
                  const baseUrl = API_BASE_URL.replace("/index.php", "");
                  const fileUrl = `${baseUrl}/${book.file_path}`;
                  const coverUrl = book.cover_image_path ? `${baseUrl}/${book.cover_image_path}` : null;
                  
                  return (
                    <Glass key={book.id} style={{ padding: 14, display: "flex", gap: 12, transition: "transform 0.15s, box-shadow 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                      <div style={{
                        width: 50, height: 68, borderRadius: 7, flexShrink: 0,
                        background: "var(--muted)",
                        border: "1px solid var(--glass-border)",
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
                      }}>
                        {coverUrl ? (
                          <img src={coverUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <BookOpen size={20} style={{ color: "var(--subtext)", opacity: 0.5 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--heading)", lineHeight: 1.35, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
                        <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 6 }}>{book.author || "Unknown Author"}</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: "auto" }}>
                          {book.category && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#219EBC", background: "rgba(33,158,188,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                              {book.category}
                            </span>
                          )}
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#219EBC", textDecoration: "none", fontWeight: 700 }}>
                            View PDF <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </Glass>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: FAQ + contact */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Glass>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
                <HelpCircle size={15} style={{ color: "#FFB703" }} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>Frequently Asked Questions</span>
              </div>
              <div style={{ padding: "4px 0" }}>
                {FAQS.map((faq, i) => (
                  <div key={i} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: "100%", padding: "11px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--heading)", textAlign: "left", lineHeight: 1.4 }}>{faq.q}</span>
                      {openFaq === i ? <ChevronUp size={13} style={{ color: "var(--subtext)", flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: "var(--subtext)", flexShrink: 0 }} />}
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: "0 18px 12px", fontSize: 12, color: "var(--subtext)", lineHeight: 1.6 }}>{faq.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </Glass>

            <Glass style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MessageCircle size={15} style={{ color: "#219EBC" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>Still need help?</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--subtext)", margin: "0 0 12px", lineHeight: 1.6 }}>
                Contact the school support team. We typically respond within 24 hours on school days.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setActiveView("guides")}
                  style={{ flex: 1, padding: "9px", borderRadius: 9, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", color: "#219EBC", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  View Study Guides
                </button>
              </div>
            </Glass>
          </div>
        </div>
      )}

      {/* ── STUDY GUIDES VIEW ── */}
      {activeView === "guides" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(155,93,229,0.07)", border: "1px solid rgba(155,93,229,0.2)", marginBottom: 20 }}>
            <GraduationCap size={16} style={{ color: "#9b5de5", flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: "var(--subtext)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--heading)" }}>Curriculum Study Guides</strong> — these PDF guides are uploaded by the school administration and contain the full academic curriculum, weekly topic schedules, and exam preparation tips for each school level.
            </div>
          </div>

          <div className="responsive-grid-3" style={{ gap: 16, marginBottom: 24 }}>
            {GUIDE_BASES.map(g => {
              const available = guideStatuses[g.key];
              const baseUrl = API_BASE_URL.replace("/index.php", "");
              const pdfUrl = `${baseUrl}/public/study_guides/${g.key}_guide.pdf`;
              return (
                <Glass key={g.key} style={{ padding: 24, textAlign: "center", position: "relative", overflow: "hidden" }}>
                  {/* Color accent bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${g.color}88, ${g.color})` }} />

                  <div style={{ fontSize: 40, marginBottom: 12 }}>{g.emoji}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--heading)", marginBottom: 6 }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: "var(--subtext)", marginBottom: 18, lineHeight: 1.5 }}>{g.desc}</div>

                  {available ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "10px", borderRadius: 9, textDecoration: "none",
                          background: `linear-gradient(135deg, ${g.color}cc, ${g.color})`,
                          color: "#fff", fontSize: 13, fontWeight: 700,
                          boxShadow: `0 4px 12px ${g.color}40`
                        }}>
                        <ExternalLink size={14} /> Open Guide
                      </a>
                      <a
                        href={pdfUrl}
                        download
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "8px", borderRadius: 9, textDecoration: "none",
                          background: "var(--muted)", border: "1px solid var(--glass-border)",
                          color: "var(--subtext)", fontSize: 12, fontWeight: 600
                        }}>
                        <Download size={13} /> Download PDF
                      </a>
                    </div>
                  ) : (
                    <div style={{
                      padding: "12px", borderRadius: 9, background: "rgba(142,202,230,0.06)",
                      border: "1px dashed var(--glass-border)", color: "var(--subtext)", fontSize: 12
                    }}>
                      <FileText size={18} style={{ opacity: 0.4, marginBottom: 4 }} />
                      <div>Not yet uploaded by admin</div>
                    </div>
                  )}
                </Glass>
              );
            })}
          </div>

          {/* Curriculum overview table */}
          <Glass>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Book size={15} style={{ color: "#219EBC" }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>Curriculum At A Glance</span>
              <span style={{ fontSize: 11, color: "var(--subtext)", marginLeft: 4 }}>NERDC-Aligned Subjects by Level</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(33,158,188,0.05)" }}>
                    {["Level", "Core Subjects", "Electives / Vocational", "External Exam"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--glass-border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: "Nursery 1–3", core: "English Language, Mathematics, Basic Science, Social Studies", electives: "Phonics, Arts & Crafts, Music, Physical Education", exam: "Internal Assessment" },
                    { level: "Primary 1–3", core: "English Language, Mathematics, Basic Science, Social Studies, CRS/IRS", electives: "Yoruba Language, Computer Studies, Fine & Applied Arts", exam: "Internal Assessment" },
                    { level: "Primary 4–6", core: "English Language, Mathematics, Basic Science, Social Studies, Agricultural Science", electives: "Home Economics, Music, Computer Studies", exam: "NPEC / State Exam" },
                    { level: "JSS 1–3", core: "English Language, Mathematics, Integrated Science, Social Studies, Basic Technology, CRS/IRS", electives: "French, Yoruba Language, Agriculture, Home Economics", exam: "BECE (JSCE)" },
                    { level: "SS 1–2", core: "English Language, Mathematics, Physics, Chemistry, Biology, Economics", electives: "Further Mathematics, Accounting, Government, Geography, Literature", exam: "Continuous Assessment" },
                    { level: "SS 3", core: "English Language, Mathematics, Physics, Chemistry, Biology, Economics", electives: "Further Mathematics, Accounting, Government, Geography, Literature", exam: "WAEC SSCE / NECO" },
                  ].map((row, i) => (
                    <tr key={row.level} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--heading)" }}>{row.level}</span>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", fontSize: 11.5, color: "var(--subtext)", lineHeight: 1.55 }}>{row.core}</td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", fontSize: 11.5, color: "var(--subtext)", lineHeight: 1.55 }}>{row.electives}</td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#219EBC", background: "rgba(33,158,188,0.1)", padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>{row.exam}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}
