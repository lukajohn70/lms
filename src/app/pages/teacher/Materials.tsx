import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Film, Image, CheckCircle, Trash2, BookOpen, AlertCircle } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
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

  // Load courses (from classes endpoint) and materials on mount
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
      setError("Please fill in the title, select a course, and choose a file.");
      return;
    }
    setError("");
    setUploading(true);

    const token = localStorage.getItem("token") || "";
    const form  = new FormData();
    form.append("course_id", courseId);
    form.append("title", title);
    form.append("material_file", file);

    try {
      const baseUrl = window.location.origin;
      const res = await fetch(`${baseUrl}/lms/api/index.php?path=/materials/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

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
    if (!confirm("Delete this material? This cannot be undone.")) return;
    apiClient.post("/teacher/materials/delete", { id })
      .then(() => setFiles(prev => prev.filter(f => f.id !== id)))
      .catch(() => setError("Failed to delete material"));
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Upload Materials</h1>
        <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Share lecture notes, videos, and resources with your students</p>
      </div>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(33,158,188,0.1)", border: "1px solid rgba(33,158,188,0.25)", marginBottom: 16 }}>
          <CheckCircle size={14} style={{ color: "#219EBC" }} />
          <span style={{ fontSize: 12.5, color: "#219EBC" }}>Material uploaded and saved to database!</span>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 9, background: "rgba(251,133,0,0.08)", border: "1px solid rgba(251,133,0,0.25)", marginBottom: 16 }}>
          <AlertCircle size={14} style={{ color: "#FB8500" }} />
          <span style={{ fontSize: 12.5, color: "#FB8500" }}>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18 }} className="cbt-layout">
        {/* File list — desktop full table, mobile cards */}
        <Glass>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--glass-border)", fontSize: 13.5, fontWeight: 600, color: "var(--heading)" }}>
            Uploaded Materials {!loading && `(${files.length})`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 60px 50px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
            {["File Name", "Course", "Date", "Type", ""].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {loading ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--subtext)", fontSize: 13 }}>Loading materials...</div>
          ) : files.length === 0 ? (
            <div style={{ padding: "40px 18px", textAlign: "center" }}>
              <BookOpen size={40} style={{ color: "var(--subtext)", opacity: 0.4, display: "block", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 13, color: "var(--subtext)" }}>No materials uploaded yet.</div>
            </div>
          ) : (
            <>
              {/* Desktop table view */}
              <div className="desktop-only">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 60px 50px", padding: "8px 18px", borderBottom: "1px solid var(--glass-border)" }}>
                  {["File Name", "Course", "Date", "Type", ""].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--subtext)", textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {files.map(f => (
                  <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 60px 50px", padding: "11px 18px", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(142,202,230,0.1)", border: "1px solid rgba(142,202,230,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8ECAE6", flexShrink: 0 }}>
                        <IconFor t={f.file_type} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                        {f.description && <div style={{ fontSize: 10, color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.description}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.course_name}</span>
                    <span style={{ fontSize: 11, color: "var(--subtext)" }}>{f.date}</span>
                    <span style={{ fontSize: 10, color: "var(--subtext)", textTransform: "uppercase", fontWeight: 600 }}>{f.ext}</span>
                    <button onClick={() => handleDelete(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FB8500", padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Mobile card view */}
              <div className="mobile-only" style={{ display: "flex", flexDirection: "column" }}>
                {files.map(f => (
                  <div key={f.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(142,202,230,0.1)", border: "1px solid rgba(142,202,230,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8ECAE6", flexShrink: 0 }}>
                      <IconFor t={f.file_type} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                      <div style={{ fontSize: 11, color: "var(--subtext)", marginTop: 2 }}>{f.course_name} · {f.date} · <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{f.ext}</span></div>
                    </div>
                    <button onClick={() => handleDelete(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FB8500", padding: 4, flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Glass>

        {/* Upload form */}
        <Glass style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", marginBottom: 16, display: "flex", alignItems: "center", gap: 7 }}>
            <Upload size={14} style={{ color: "#219EBC" }} /> Upload New Material
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            style={{ border: `2px dashed ${dragging ? "#219EBC" : file ? "rgba(33,158,188,0.5)" : "var(--glass-border)"}`, borderRadius: 12, padding: "20px", textAlign: "center", marginBottom: 16, background: dragging ? "rgba(33,158,188,0.05)" : file ? "rgba(33,158,188,0.03)" : "transparent", transition: "all 0.2s", cursor: "pointer" }}
          >
            <Upload size={24} style={{ color: file ? "#219EBC" : dragging ? "#219EBC" : "var(--subtext)", display: "block", margin: "0 auto 8px" }} />
            {file ? (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#219EBC" }}>{file.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--subtext)", marginTop: 3 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12.5, color: "var(--subtext)" }}>Drop file here or click to select</div>
                <div style={{ fontSize: 10.5, color: "var(--subtext)", marginTop: 4 }}>PDF, DOC, PPT, ZIP, JPG, PNG</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </div>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase" }}>Material Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Wave Functions Lecture 4"
              style={{ width: "100%", padding: "9px 13px", borderRadius: 9, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Course select (from real DB) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--subtext)", marginBottom: 5, textTransform: "uppercase" }}>Course / Class</label>
            {courses.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--subtext)", padding: "8px 0" }}>No courses assigned.</div>
            ) : (
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                style={{ width: "100%", padding: "9px 13px", borderRadius: 9, border: "1px solid var(--glass-border)", background: "var(--muted)", fontSize: 13, color: "var(--heading)", outline: "none" }}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <button onClick={handleUpload} disabled={uploading || courses.length === 0}
            style={{ width: "100%", padding: "11px", borderRadius: 10, background: uploading ? "var(--muted)" : "linear-gradient(135deg,#219EBC,#1a8aaa)", border: "none", cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: uploading ? "var(--subtext)" : "#fff", boxShadow: uploading ? "none" : "0 4px 14px rgba(33,158,188,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Upload size={14} /> {uploading ? "Uploading..." : "Upload & Distribute"}
          </button>
        </Glass>
      </div>
    </div>
  );
}
