import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Film, Image, CheckCircle, Trash2, BookOpen, AlertCircle, FileSpreadsheet } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const DLHS = {
  navy: "#293D7D",
  navyDark: "#16234B",
  crimson: "#DC137B",
  crimsonHover: "#B80F66",
  blue: "#0093DD",
  gold: "#D4AF37",
  periwinkle: "#BFD1FF",
  slate: "#3A4244",
};

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div
    style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      ...style
    }}
  >
    {children}
  </div>
);

const IconFor = ({ t }: { t: string }) => {
  if (t === "video") return <Film size={15} />;
  if (t === "image") return <Image size={15} />;
  return <FileText size={15} />;
};

export default function Materials() {
  // List state
  const [files, setFiles]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  // Upload state
  const [courses, setCourses]   = useState<any[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle]       = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = () => {
    setLoading(true);
    apiClient.get("/teacher/materials")
      .then((res: any) => setFiles(res.materials || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  };

  // Load courses and materials on mount
  useEffect(() => {
    apiClient.get("/teacher/classes")
      .then((res: any) => {
        const cs = res.courses || [];
        setCourses(cs);
        if (cs.length > 0) setCourseId(String(cs[0].id));
      });
    fetchMaterials();
  }, []);

  const handleUpload = async () => {
    if (!title.trim() || !courseId || !file) {
      setError("Please fill in the title, select a course stream, and choose a file.");
      return;
    }
    setError("");
    setUploading(true);

    const form = new FormData();
    form.append("course_id", courseId);
    form.append("title", title);
    form.append("material_file", file);

    try {
      await apiClient.postForm('/materials/upload', form);

      setSuccess(true);
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchMaterials();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this academic resource?")) return;
    apiClient.post("/teacher/materials/delete", { id })
      .then(() => setFiles(prev => prev.filter(f => f.id !== id)))
      .catch(() => setError("Failed to delete material"));
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>
          Curriculum Materials &amp; Lecture Notes
        </h1>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: 0 }}>
          Publish syllabi, lecture notes, instructional slides, and study resources for candidate access
        </p>
      </div>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}40`, marginBottom: 16 }}>
          <CheckCircle size={16} style={{ color: DLHS.navy }} />
          <span style={{ fontSize: 13, color: DLHS.navy, fontWeight: 600 }}>Material uploaded and archived in course registry successfully!</span>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 8, background: "rgba(220, 19, 123, 0.08)", border: `1px solid ${DLHS.crimson}40`, marginBottom: 16 }}>
          <AlertCircle size={16} style={{ color: DLHS.crimson }} />
          <span style={{ fontSize: 13, color: DLHS.crimson, fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18 }} className="cbt-layout">
        {/* File list */}
        <Glass>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
              Uploaded Course Resources {!loading && `(${files.length})`}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Digital Library</span>
          </div>

          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${DLHS.navy}`, borderTopColor: "transparent", margin: "0 auto 10px", animation: "spin 1s linear infinite" }} />
              Loading curriculum files…
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <BookOpen size={40} style={{ color: DLHS.navy, opacity: 0.35, display: "block", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No materials uploaded to this subject yet.</div>
            </div>
          ) : (
            <>
              {/* Desktop table view */}
              <div className="desktop-only">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 70px 44px", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                  {["File Name & Title", "Course Stream", "Date Added", "Type", ""].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                  ))}
                </div>
                {files.map(f => (
                  <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 70px 44px", padding: "12px 20px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}25`, display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.navy, flexShrink: 0 }}>
                        <IconFor t={f.file_type} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                        {f.description && <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.course_name}</span>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{f.date}</span>
                    <span style={{ fontSize: 11, color: DLHS.navy, textTransform: "uppercase", fontWeight: 700 }}>{f.ext}</span>
                    <button onClick={() => handleDelete(f.id)} title="Delete material" style={{ background: "none", border: "none", cursor: "pointer", color: DLHS.crimson, padding: 4, display: "flex", alignItems: "center" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Mobile card view */}
              <div className="mobile-only" style={{ display: "flex", flexDirection: "column" }}>
                {files.map(f => (
                  <div key={f.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(41, 61, 125, 0.08)", border: `1px solid ${DLHS.navy}25`, display: "flex", alignItems: "center", justifyContent: "center", color: DLHS.navy, flexShrink: 0 }}>
                      <IconFor t={f.file_type} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>{f.course_name} · {f.date} · <span style={{ textTransform: "uppercase", fontWeight: 700, color: DLHS.navy }}>{f.ext}</span></div>
                    </div>
                    <button onClick={() => handleDelete(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: DLHS.crimson, padding: 4, flexShrink: 0 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Glass>

        {/* Upload form */}
        <Glass style={{ padding: 22, height: "fit-content" }}>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 800, color: "var(--foreground)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={16} style={{ color: DLHS.navy }} /> Upload New Resource
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            style={{
              border: `2px dashed ${dragging ? DLHS.navy : file ? DLHS.navy : "var(--border)"}`,
              borderRadius: 12,
              padding: "24px 16px",
              textAlign: "center",
              marginBottom: 16,
              background: dragging ? "rgba(41, 61, 125, 0.05)" : file ? "rgba(41, 61, 125, 0.03)" : "var(--muted)",
              transition: "all 0.15s ease",
              cursor: "pointer"
            }}
          >
            <Upload size={26} style={{ color: file ? DLHS.navy : dragging ? DLHS.navy : "var(--muted-foreground)", display: "block", margin: "0 auto 8px" }} />
            {file ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: DLHS.navy }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Choose file or drag here</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>PDF, DOC, PPT, ZIP, JPG, PNG</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5, textTransform: "uppercase" }}>Material Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Wave Optics &amp; Laser Theory Lecture 4"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Course select */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 5, textTransform: "uppercase" }}>Subject / Class Arm</label>
            {courses.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>No courses allocated.</div>
            ) : (
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 13, color: "var(--foreground)", outline: "none" }}
              >
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || courses.length === 0}
            style={{
              width: "100%", padding: "12px", borderRadius: 8,
              background: uploading ? "var(--muted)" : DLHS.navy,
              border: "none", cursor: uploading ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700, color: uploading ? "var(--muted-foreground)" : "#ffffff",
              boxShadow: uploading ? "none" : "0 4px 12px rgba(41, 61, 125, 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}
          >
            <Upload size={14} /> {uploading ? "Uploading Resource…" : "Upload & Distribute"}
          </button>
        </Glass>
      </div>
    </div>
  );
}
