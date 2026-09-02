import { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, Search } from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>
    {children}
  </div>
);

export default function AdminLibrary() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const { books } = await apiClient.get("/library/books");
      setBooks(books || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("title", title);
    if (author) formData.append("author", author);
    if (category) formData.append("category", category);
    formData.append("file", file);
    if (cover) formData.append("cover", cover);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/library/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setTitle("");
      setAuthor("");
      setCategory("");
      setFile(null);
      setCover(null);
      setShowUpload(false);
      fetchBooks();
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      await apiClient.post(`/admin/library/delete?id=${id}`, {});
      fetchBooks();
    } catch (e) {
      alert("Failed to delete.");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: "#FB8500", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Academic Setup</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--heading)", margin: 0 }}>E-Library Manager</h1>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{ padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #FB8500, #E85D04)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
        >
          <Plus size={16} /> Upload Book
        </button>
      </div>

      <Glass style={{ padding: 20 }}>
        {loading ? (
          <div style={{ color: "var(--subtext)", fontSize: 13 }}>Loading library...</div>
        ) : books.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--subtext)" }}>
            <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>The E-Library is currently empty.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Click "Upload Book" to add real PDFs and resources.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {books.map(book => {
              const baseUrl = API_BASE_URL.replace("/index.php", "");
              const coverUrl = book.cover_image_path ? `${baseUrl}/${book.cover_image_path}` : null;
              const fileUrl = `${baseUrl}/${book.file_path}`;

              return (
                <div key={book.id} style={{ display: "flex", gap: 12, padding: 12, borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                  <div style={{ width: 60, height: 80, borderRadius: 6, background: "var(--background)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {coverUrl ? (
                      <img src={coverUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <BookOpen size={20} style={{ color: "var(--subtext)", opacity: 0.5 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--heading)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</div>
                    <div style={{ fontSize: 11, color: "var(--subtext)", marginBottom: 6 }}>{book.author || "Unknown Author"}</div>
                    {book.category && <div style={{ fontSize: 9.5, background: "rgba(33,158,188,0.1)", color: "#219EBC", padding: "2px 6px", borderRadius: 4, display: "inline-block", alignSelf: "flex-start", marginBottom: 6 }}>{book.category}</div>}
                    
                    <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                      <a href={fileUrl} target="_blank" style={{ fontSize: 11, color: "#219EBC", textDecoration: "none", fontWeight: 600 }}>View PDF</a>
                      <button onClick={() => handleDelete(book.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Glass>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 450, padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 16px", color: "var(--heading)" }}>Upload Library Book</h3>
            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Book Title*</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Author</label>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Category/Subject</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Science" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Book File (PDF/EPUB)*</label>
                <input required type="file" accept=".pdf,.epub,.docx" onChange={e => setFile(e.target.files?.[0] || null)} style={{ width: "100%", fontSize: 12, color: "var(--heading)" }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Cover Image (Optional)</label>
                <input type="file" accept="image/*" onChange={e => setCover(e.target.files?.[0] || null)} style={{ width: "100%", fontSize: 12, color: "var(--heading)" }} />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowUpload(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={uploading} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#FB8500", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
}
