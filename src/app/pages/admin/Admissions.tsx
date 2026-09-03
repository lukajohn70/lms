import { useState, useEffect } from "react";
import { 
  GraduationCap, Search, Filter, Calendar, Award, FileText, 
  CheckCircle, XCircle, MoreVertical, MapPin, User, Mail, 
  Phone, Clock, Printer, X, Save, Edit2
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

const BACKEND_URL = API_BASE_URL.replace('/index.php', '/');

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => {
  const { theme } = useApp();
  return (
    <div style={{
      background: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(33,158,188,0.12)"}`,
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 8px 32px rgba(2, 48, 71, 0.04)",
      ...style
    }}>
      {children}
    </div>
  );
};

export default function AdminAdmissions() {
  const { theme } = useApp();
  
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected applicant details for modals
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Grade state
  const [scoreEng, setScoreEng] = useState("");
  const [scoreMath, setScoreMath] = useState("");
  const [scoreGen, setScoreGen] = useState("");
  const [gradeLoading, setGradeLoading] = useState(false);

  // Schedule state
  const [examType, setExamType] = useState("entrance");
  const [examDate, setExamDate] = useState("");
  const [examVenue, setExamVenue] = useState("");
  const [examSeat, setExamSeat] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Load admissions
  const loadAdmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.get("/admissions");
      setApplications(data.applications || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  // Open Grade modal
  const handleOpenGrade = (app: any) => {
    setSelectedApp(app);
    setScoreEng(app.score_english !== null ? app.score_english.toString() : "");
    setScoreMath(app.score_math !== null ? app.score_math.toString() : "");
    setScoreGen(app.score_general !== null ? app.score_general.toString() : "");
    setShowGradeModal(true);
  };

  // Submit grades
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setGradeLoading(true);
    try {
      await apiClient.post("/admissions/update", {
        id: selectedApp.id,
        score_english: parseInt(scoreEng) || 0,
        score_math: parseInt(scoreMath) || 0,
        score_general: parseInt(scoreGen) || 0,
        status: "exam_completed"
      });
      setShowGradeModal(false);
      loadAdmissions();
    } catch (err: any) {
      alert(err.message || "Failed to submit scores.");
    } finally {
      setGradeLoading(false);
    }
  };

  // Open Schedule modal
  const handleOpenSchedule = (app: any) => {
    setSelectedApp(app);
    setExamType(app.exam_type || "entrance");
    // Format date string for datetime-local input (YYYY-MM-DDTHH:MM)
    if (app.exam_date) {
      const d = new Date(app.exam_date);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
      setExamDate(iso.slice(0, 16));
    } else {
      setExamDate("");
    }
    setExamVenue(app.exam_venue || "");
    setExamSeat(app.exam_seat_number || "");
    setShowScheduleModal(true);
  };

  // Submit Schedule
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setScheduleLoading(true);
    try {
      await apiClient.post("/admissions/update", {
        id: selectedApp.id,
        exam_type: examType,
        exam_date: examDate ? examDate.replace("T", " ") + ":00" : null,
        exam_venue: examVenue,
        exam_seat_number: examSeat,
        status: "exam_scheduled"
      });
      setShowScheduleModal(false);
      loadAdmissions();
    } catch (err: any) {
      alert(err.message || "Failed to update schedule.");
    } finally {
      setScheduleLoading(false);
    }
  };

  // Approve Admission
  const handleApprove = async (id: number) => {
    if (!confirm("Are you sure you want to approve this candidate? This will automatically generate an Admission Number and send an offer.")) return;
    try {
      await apiClient.post("/admissions/approve", { id });
      loadAdmissions();
    } catch (err: any) {
      alert(err.message || "Failed to approve admission.");
    }
  };

  // Reject Admission
  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to reject this candidate?")) return;
    try {
      await apiClient.post("/admissions/reject", { id });
      loadAdmissions();
    } catch (err: any) {
      alert(err.message || "Failed to reject application.");
    }
  };

  // Print Admission Letter
  const handlePrintAdmissionLetter = (app: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const sessionYear = "2026/2027";

    printWindow.document.write(`
      <html>
        <head>
          <title>Admission Letter - ${app.child_first_name} ${app.child_last_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@700;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'EB Garamond', Georgia, serif; color: #012030; background: #fff; padding: 0; }
            .page { max-width: 720px; margin: 0 auto; padding: 48px 56px; min-height: 100vh; position: relative; }
            /* Decorative border */
            .page::before {
              content: '';
              position: absolute;
              inset: 18px;
              border: 2.5px solid #219EBC;
              pointer-events: none;
            }
            .page::after {
              content: '';
              position: absolute;
              inset: 22px;
              border: 1px solid rgba(33,158,188,0.25);
              pointer-events: none;
            }
            /* Header */
            .header { display: flex; align-items: center; gap: 18px; padding-bottom: 18px; border-bottom: 2px solid #219EBC; margin-bottom: 28px; }
            .logo { width: 70px; height: 70px; border-radius: 14px; flex-shrink: 0; }
            .school-info { flex: 1; }
            .school-name { font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 800; color: #012030; letter-spacing: 0.5px; text-transform: uppercase; }
            .school-tagline { font-size: 12px; color: #fb8500; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
            .school-contact { font-size: 11px; color: #5a7f92; margin-top: 5px; line-height: 1.6; }
            .ref-block { text-align: right; font-size: 12px; color: #5a7f92; line-height: 1.8; }
            /* Title bar */
            .letter-title { text-align: center; margin-bottom: 28px; }
            .letter-title h2 { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #012030; background: rgba(33,158,188,0.08); display: inline-block; padding: 8px 28px; border-radius: 4px; border-bottom: 2px solid #219EBC; }
            /* Body text */
            .salutation { font-size: 15px; line-height: 1.8; margin-bottom: 14px; }
            .body-text { font-size: 14.5px; line-height: 1.85; margin-bottom: 16px; text-align: justify; }
            /* Info table */
            .info-table { width: 100%; border-collapse: collapse; margin: 22px 0; font-size: 13.5px; }
            .info-table tr { border-bottom: 1px dashed rgba(33,158,188,0.2); }
            .info-table tr:first-child { border-top: 1px solid rgba(33,158,188,0.2); }
            .info-table td { padding: 9px 14px; vertical-align: top; }
            .info-table td:first-child { font-weight: 700; color: #5a7f92; width: 40%; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.3px; }
            .info-table td:last-child { font-weight: 600; color: #012030; font-size: 14px; }
            .adm-number { font-size: 20px; font-family: 'Montserrat', sans-serif; font-weight: 800; color: #fb8500; }
            /* Instruction box */
            .instruction-box { background: rgba(33,158,188,0.05); border-left: 4px solid #219EBC; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .instruction-box h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #219EBC; font-weight: 700; margin-bottom: 8px; }
            .instruction-box ol { padding-left: 18px; }
            .instruction-box li { font-size: 13px; line-height: 1.7; margin-bottom: 4px; }
            /* Fee note */
            .fee-note { background: rgba(251,133,0,0.06); border: 1px solid rgba(251,133,0,0.2); border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; line-height: 1.6; }
            .fee-note strong { color: #fb8500; }
            /* Signature */
            .signature-block { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sign-left { font-size: 13.5px; line-height: 1.7; }
            .sign-line { width: 200px; border-bottom: 1.5px solid #012030; margin-bottom: 5px; height: 36px; }
            .sign-label { font-size: 11.5px; color: #5a7f92; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
            .stamp-circle { width: 80px; height: 80px; border-radius: 50%; border: 3px double #219EBC; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center; color: #219EBC; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4; }
            /* Footer */
            .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid rgba(33,158,188,0.2); text-align: center; font-size: 10.5px; color: #b5c7d3; line-height: 1.6; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- HEADER -->
            <div class="header">
              <img src="${window.location.origin}/lms/public/logo.png" class="logo" alt="Aroura Academy Logo" onerror="this.style.display='none'" />
              <div class="school-info">
                <div class="school-name">Aroura Academy</div>
                <div class="school-tagline">Excellence in Education · Est. 2005</div>
                <div class="school-contact">
                  📍 12 Aroura Close, Victoria Island, Lagos, Nigeria &nbsp;|&nbsp; 📞 +234 801 234 5678 &nbsp;|&nbsp; ✉ admissions@aroura.edu.ng
                </div>
              </div>
              <div class="ref-block">
                <div><strong>Ref:</strong> ${app.admission_number}</div>
                <div><strong>Date:</strong> ${today}</div>
                <div><strong>Session:</strong> ${sessionYear}</div>
              </div>
            </div>

            <!-- TITLE -->
            <div class="letter-title">
              <h2>Letter of Admission</h2>
            </div>

            <!-- SALUTATION -->
            <p class="salutation">
              Dear <strong>${app.parent_first_name} ${app.parent_last_name}</strong> (${app.parent_relationship}),
            </p>

            <!-- OPENING BODY -->
            <p class="body-text">
              On behalf of the Management and Board of Directors of <strong>Aroura Academy</strong>, it is our distinct pleasure and honour to inform you that, following the successful completion of our Entrance Examination and the thorough review of your application, your ward has been <strong>offered admission</strong> into Aroura Academy for the <strong>${sessionYear} Academic Session</strong>.
            </p>
            <p class="body-text">
              We are confident that your ward possesses the qualities and academic potential that align with Aroura Academy's standards of excellence. We warmly welcome <strong>${app.child_first_name} ${app.child_last_name}</strong> into our school community.
            </p>

            <!-- CANDIDATE INFO TABLE -->
            <table class="info-table">
              <tr>
                <td>Admission Number</td>
                <td><span class="adm-number">${app.admission_number}</span></td>
              </tr>
              <tr>
                <td>Candidate's Full Name</td>
                <td>${app.child_first_name} ${app.child_last_name}</td>
              </tr>
              <tr>
                <td>Date of Birth</td>
                <td>${app.child_dob}</td>
              </tr>
              <tr>
                <td>Gender</td>
                <td>${app.child_gender}</td>
              </tr>
              <tr>
                <td>Class Admitted Into</td>
                <td>${app.grade_level} — ${sessionYear} Session</td>
              </tr>
              <tr>
                <td>Application Number</td>
                <td>${app.application_number}</td>
              </tr>
              <tr>
                <td>Parent / Guardian</td>
                <td>${app.parent_first_name} ${app.parent_last_name} (${app.parent_relationship})</td>
              </tr>
              <tr>
                <td>Parent Contact</td>
                <td>${app.parent_email} &nbsp;|&nbsp; ${app.parent_phone}</td>
              </tr>
            </table>

            <!-- INSTRUCTIONS -->
            <div class="instruction-box">
              <h4>Acceptance & Resumption Requirements</h4>
              <ol>
                <li>Acceptance of this offer must be communicated <strong>within 14 days</strong> of the date of this letter via the Parent Portal.</li>
                <li>Payment of first-term school fees and levies must be completed before or on <strong>resumption day</strong>.</li>
                <li>All required documents (birth certificate, previous school report cards, immunisation records) must be submitted to the Admissions Office.</li>
                <li>The candidate must present this <strong>original Admission Letter</strong> on the first day of resumption.</li>
                <li>Kindly visit the Parent Portal to complete your ward's enrolment and access their student credentials.</li>
              </ol>
            </div>

            <!-- FEE NOTE -->
            <div class="fee-note">
              ⚠ Please note that this offer of admission <strong>expires 30 days from the date of this letter</strong> if the acceptance fee and school fees are not paid. Aroura Academy reserves the right to offer the position to another candidate.
            </div>

            <!-- CLOSING -->
            <p class="body-text">
              We look forward to welcoming <strong>${app.child_first_name}</strong> to Aroura Academy and are excited to partner with your family in shaping an extraordinary educational journey. Should you require any clarification, please do not hesitate to contact the Admissions Office.
            </p>
            <p class="body-text">Yours faithfully,</p>

            <!-- SIGNATURE BLOCK -->
            <div class="signature-block">
              <div class="sign-left">
                <div class="sign-line"></div>
                <div style="font-weight: 700; font-size: 14px;">The Registrar</div>
                <div class="sign-label">Aroura Academy &nbsp;|&nbsp; Admissions Office</div>
              </div>
              <div class="stamp-circle">AROURA<br/>ACADEMY<br/>OFFICIAL<br/>SEAL</div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
              This is an officially generated document by the Aroura Academy Admissions Management System.<br/>
              For verification, contact admissions@aroura.edu.ng or call +234 801 234 5678.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Exam Card
  const handlePrintCard = (appDetails: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formattedDate = new Date(appDetails.exam_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    const formattedTime = new Date(appDetails.exam_date).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit"
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Entrance Exam Card - ${appDetails.child_first_name || ''} ${appDetails.child_last_name || ''}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #023047; padding: 20px; }
            .card { border: 3px double #219EBC; padding: 30px; max-width: 650px; margin: 0 auto; position: relative; border-radius: 12px; background: #fafdfc; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(33, 158, 188, 0.05); font-weight: 800; pointer-events: none; z-index: 0; white-space: nowrap; }
            .header { display: flex; align-items: center; border-bottom: 2px solid #219EBC; padding-bottom: 15px; margin-bottom: 20px; z-index: 1; position: relative; }
            .logo { width: 60px; height: 60px; border-radius: 12px; margin-right: 15px; }
            .title { flex-grow: 1; }
            .title h1 { margin: 0; font-size: 22px; color: #023047; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .title p { margin: 3px 0 0; font-size: 12px; color: #fb8500; font-weight: 600; text-transform: uppercase; }
            .details { display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 25px; z-index: 1; position: relative; }
            .photo-box { width: 120px; height: 130px; border: 2px dashed #b5c7d3; display: flex; align-items: center; justify-content: center; background: #f0f4f7; font-size: 11px; color: #5a7f92; font-weight: 600; text-align: center; border-radius: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; }
            .info-item { margin-bottom: 6px; }
            .info-label { font-weight: bold; color: #5a7f92; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
            .info-value { font-weight: 600; color: #023047; }
            .schedule-box { background: rgba(33, 158, 188, 0.08); border: 1.5px solid rgba(33, 158, 188, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px; z-index: 1; position: relative; }
            .schedule-title { font-weight: bold; color: #219EBC; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; letter-spacing: 0.5px; }
            .schedule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; }
            .instructions { font-size: 11.5px; line-height: 1.5; color: #5a7f92; border-top: 1px solid #dde3e8; padding-top: 15px; z-index: 1; position: relative; }
            .instructions ol { padding-left: 20px; margin: 5px 0 0; }
            @media print {
              body { padding: 0; background: #fff; }
              .card { border: 2px solid #219EBC; box-shadow: none; max-width: 100%; margin: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="watermark">AROURA ACADEMY</div>
            <div class="header">
              <img src="/logo.png" class="logo" alt="Logo" />
              <div class="title">
                <h1>Aroura Academy</h1>
                <p>Entrance Examination Photo Card</p>
              </div>
            </div>
            <div class="details">
              <div class="photo-box">
                ${appDetails.passport_path 
                  ? `<img src="${BACKEND_URL}${appDetails.passport_path}" style="width:120px;height:130px;object-fit:cover;border-radius:8px;" />`
                  : 'PASSPORT<br>PHOTOGRAPH'
                }
              </div>
              <div class="info-grid">
                <div class="info-item" style="grid-column: span 2;">
                  <div class="info-label">Application Number</div>
                  <div class="info-value" style="font-size: 16px; color: #fb8500; font-weight: 700;">${appDetails.application_number || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Candidate Name</div>
                  <div class="info-value">${appDetails.child_first_name || ''} ${appDetails.child_last_name || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Class Applied For</div>
                  <div class="info-value">${appDetails.grade_level || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date of Birth</div>
                  <div class="info-value">${appDetails.child_dob || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Gender</div>
                  <div class="info-value">${appDetails.child_gender || ''}</div>
                </div>
              </div>
            </div>
            
            <div class="schedule-box">
              <div class="schedule-title">Examination Schedule</div>
              <div class="schedule-grid">
                <div class="info-item">
                  <div class="info-label">Exam Type</div>
                  <div class="info-value" style="text-transform: uppercase;">${appDetails.exam_type || 'entrance'} Exam</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Seat Number</div>
                  <div class="info-value" style="color: #fb8500; font-weight: 700;">${appDetails.exam_seat_number || 'SEAT-100'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date</div>
                  <div class="info-value">${formattedDate}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Time & Venue</div>
                  <div class="info-value">${formattedTime} | ${appDetails.exam_venue || 'Main Auditorium'}</div>
                </div>
              </div>
            </div>
            <div class="instructions"><strong>Important Instructions:</strong>
              <ol>
                <li>Print this card and bring it to the exam venue.</li>
                <li><strong>Required items to bring:</strong> original birth certificate, writing materials (pencils, pen, eraser, ruler), and this printed card.</li>
                <li>Report at least 30 minutes before the scheduled time.</li>
                <li>No electronic devices or calculators are allowed.</li>
                <li>This card serves as your identification. Keep it safe.</li>
              </ol>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return <span style={{ color: "#219EBC", background: "rgba(33,158,188,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>Applied</span>;
      case "exam_scheduled":
        return <span style={{ color: "#8ECAE6", background: "rgba(142,202,230,0.15)", padding: "4px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>Exam Scheduled</span>;
      case "exam_completed":
        return <span style={{ color: "#FFB703", background: "rgba(255,183,3,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>Exam Graded</span>;
      case "admitted":
        return <span style={{ color: "#2a9d8f", background: "rgba(42,157,143,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>Admitted</span>;
      case "rejected":
        return <span style={{ color: "#e76f51", background: "rgba(231,111,81,0.12)", padding: "4px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>Rejected</span>;
      default:
        return <span style={{ color: "#5a7f92", background: "rgba(90,127,146,0.1)", padding: "4px 10px", borderRadius: 100, fontSize: 11.5, fontWeight: 700 }}>{status}</span>;
    }
  };

  // Stats
  const totalApps = applications.length;
  const pendingExams = applications.filter(a => a.status === "exam_scheduled").length;
  const gradedExams = applications.filter(a => a.status === "exam_completed").length;
  const admitted = applications.filter(a => a.status === "admitted").length;

  // Filtered List
  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.child_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.child_last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.parent_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" ? true : app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Admissions Management</h1>
          <p style={{ margin: "4px 0 0", color: "#5a7f92", fontSize: 14 }}>Review new applications, schedule examinations, enter grades, and grant student enrollments.</p>
        </div>
        <button 
          onClick={loadAdmissions}
          style={{
            padding: "10px 18px", borderRadius: 10, background: "rgba(33, 158, 188, 0.1)", 
            color: "#219EBC", border: "1px solid rgba(33, 158, 188, 0.2)", cursor: "pointer", fontWeight: 700, fontSize: 13
          }}
        >
          Refresh Data
        </button>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <Glass style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(33,158,188,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#219EBC" }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{totalApps}</div>
            <div style={{ fontSize: 11.5, color: "#5a7f92", fontWeight: 500 }}>Total Applications</div>
          </div>
        </Glass>

        <Glass style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(142,202,230,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8ECAE6" }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{pendingExams}</div>
            <div style={{ fontSize: 11.5, color: "#5a7f92", fontWeight: 500 }}>Exams Scheduled</div>
          </div>
        </Glass>

        <Glass style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,183,3,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFB703" }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{gradedExams}</div>
            <div style={{ fontSize: 11.5, color: "#5a7f92", fontWeight: 500 }}>Exams Graded</div>
          </div>
        </Glass>

        <Glass style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(42,157,143,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2a9d8f" }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{admitted}</div>
            <div style={{ fontSize: 11.5, color: "#5a7f92", fontWeight: 500 }}>Granted Admissions</div>
          </div>
        </Glass>
      </div>

      {/* FILTER & SEARCH */}
      <Glass style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center" }} className="grid-admissions-filter">
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: 14, color: "#5a7f92", opacity: 0.6 }} />
            <input 
              type="text" 
              placeholder="Search by candidate name, application no, or parent email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%", padding: "11px 12px 11px 38px", borderRadius: 10, fontSize: 13.5, boxSizing: "border-box",
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                color: "inherit", outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={15} style={{ opacity: 0.6 }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                color: "inherit", outline: "none"
              }}
            >
              <option value="all">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="exam_scheduled">Exam Scheduled</option>
              <option value="exam_completed">Exam Graded</option>
              <option value="admitted">Admitted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Glass>

      {/* TABLE */}
      <Glass style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a7f92" }}>Loading admissions...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center", color: "#e76f51" }}>⚠ {error}</div>
        ) : filteredApps.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5a7f92" }}>No applications match filters.</div>
        ) : (
          <>
            <div className="desktop-only" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: `2.5px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, textAlign: "left", opacity: 0.75 }}>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>App Number</th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Candidate Details</th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Parent Contact</th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Exam Scores</th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "16px 20px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.id} style={{ borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "#dde3e8"}` }}>
                    
                    {/* App Number */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 700, color: "#fb8500", fontSize: 13.5 }}>{app.application_number}</div>
                      {app.admission_number && (
                        <div style={{ fontSize: 11, color: "#2a9d8f", fontWeight: 700, marginTop: 4 }}>Adm No: {app.admission_number}</div>
                      )}
                      <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{new Date(app.created_at).toLocaleDateString()}</div>
                    </td>

                    {/* Candidate */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {app.passport_path && (
                          <img 
                            src={BACKEND_URL + app.passport_path} 
                            alt="Candidate" 
                            style={{ width: 36, height: 42, objectFit: "cover", borderRadius: 6, border: "1.5px solid rgba(251,133,0,0.15)" }} 
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{app.child_first_name} {app.child_last_name}</div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, display: "flex", gap: 8 }}>
                            <span>Class: <strong>{app.grade_level}</strong></span>
                            <span>•</span>
                            <span>Gender: <strong>{app.child_gender}</strong></span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Parent contact */}
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{app.parent_first_name} {app.parent_last_name} ({app.parent_relationship})</div>
                      <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>📧 {app.parent_email}</span>
                        <span>📞 {app.parent_phone}</span>
                      </div>
                    </td>

                    {/* Exam Scores */}
                    <td style={{ padding: "16px 20px" }}>
                      {app.score_english !== null || app.score_math !== null || app.score_general !== null ? (
                        <div style={{ display: "flex", gap: 6, fontSize: 11.5 }}>
                          <span style={{ background: "rgba(33,158,188,0.08)", padding: "2px 6px", borderRadius: 4 }}>Eng: <strong>{app.score_english}</strong></span>
                          <span style={{ background: "rgba(251,133,0,0.08)", padding: "2px 6px", borderRadius: 4 }}>Math: <strong>{app.score_math}</strong></span>
                          <span style={{ background: "rgba(42,157,143,0.08)", padding: "2px 6px", borderRadius: 4 }}>Gen: <strong>{app.score_general}</strong></span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, opacity: 0.5 }}>Not Graded</span>
                      )}
                      
                      {app.exam_date && (
                        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} /> {new Date(app.exam_date).toLocaleDateString()} at {new Date(app.exam_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px 20px" }}>
                      {getStatusBadge(app.status)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleOpenSchedule(app)}
                          style={{
                            padding: "6px 10px", borderRadius: 6, border: "1px solid #219EBC", color: "#219EBC",
                            background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700
                          }}
                        >
                          Schedule Exam
                        </button>
                        
                        <button
                          onClick={() => handleOpenGrade(app)}
                          style={{
                            padding: "6px 10px", borderRadius: 6, border: "1px solid #FFB703", color: "#FFB703",
                            background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700
                          }}
                        >
                          Grade Exam
                        </button>

                        {app.status !== "admitted" && app.status !== "rejected" && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              style={{
                                padding: "6px 10px", borderRadius: 6, border: "none", color: "white",
                                background: "#2a9d8f", cursor: "pointer", fontSize: 11.5, fontWeight: 700
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              style={{
                                padding: "6px 10px", borderRadius: 6, border: "none", color: "white",
                                background: "#e76f51", cursor: "pointer", fontSize: 11.5, fontWeight: 700
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handlePrintCard(app)}
                          style={{
                            padding: "6px", borderRadius: 6, border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.12)" : "#dde3e8"}`, 
                            color: "inherit", background: "none", cursor: "pointer"
                          }}
                          title="Print Exam Card"
                        >
                          <Printer size={13} />
                        </button>

                        {app.status === "admitted" && app.admission_number && (
                          <button
                            onClick={() => handlePrintAdmissionLetter(app)}
                            style={{
                              padding: "6px 10px", borderRadius: 6, border: "1px solid #2a9d8f",
                              color: "#2a9d8f", background: "none", cursor: "pointer",
                              fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4
                            }}
                            title="Print Admission Letter"
                          >
                            <FileText size={12} /> Letter
                          </button>
                        )}
                      </div>

                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE ONLY CARD VIEW - ELIMINATES SIDEWAYS SCROLL */}
          <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
            {filteredApps.map((app) => (
              <div key={app.id} style={{ padding: 16, borderRadius: 12, background: theme === "dark" ? "rgba(255,255,255,0.03)" : "var(--muted)", border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.07)" : "var(--glass-border)"}`, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Top: Candidate and photo */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {app.passport_path ? (
                      <img 
                        src={BACKEND_URL + app.passport_path} 
                        alt="Candidate" 
                        style={{ width: 44, height: 50, objectFit: "cover", borderRadius: 8, border: "1.5px solid rgba(251,133,0,0.2)" }} 
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(33,158,188,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#219EBC" }}>
                        {app.child_first_name?.[0]}{app.child_last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--heading)" }}>{app.child_first_name} {app.child_last_name}</div>
                      <div style={{ fontSize: 12, color: "var(--subtext)", marginTop: 2 }}>Class: <strong>{app.grade_level}</strong> · {app.child_gender}</div>
                      <div style={{ fontWeight: 700, color: "#fb8500", fontSize: 12, marginTop: 3 }}>App: {app.application_number}</div>
                    </div>
                  </div>
                  <div>{getStatusBadge(app.status)}</div>
                </div>

                {/* Admission number if admitted */}
                {app.admission_number && (
                  <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(42,157,143,0.1)", color: "#2a9d8f", fontSize: 12, fontWeight: 700 }}>
                    Admission No: {app.admission_number}
                  </div>
                )}

                {/* Parent contact */}
                <div style={{ fontSize: 12, color: "var(--subtext)", background: "var(--glass-bg)", padding: "8px 12px", borderRadius: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontWeight: 600, color: "var(--heading)" }}>Parent: {app.parent_first_name} {app.parent_last_name} ({app.parent_relationship})</div>
                  <div>📧 {app.parent_email}</div>
                  <div>📞 {app.parent_phone}</div>
                </div>

                {/* Exam scores */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "var(--glass-bg)", fontSize: 12 }}>
                  <span>Exam Scores:</span>
                  {app.score_english !== null || app.score_math !== null || app.score_general !== null ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ background: "rgba(33,158,188,0.1)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Eng: {app.score_english}</span>
                      <span style={{ background: "rgba(251,133,0,0.1)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Math: {app.score_math}</span>
                      <span style={{ background: "rgba(42,157,143,0.1)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Gen: {app.score_general}</span>
                    </div>
                  ) : (
                    <span style={{ opacity: 0.6 }}>Not Graded</span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  <button
                    onClick={() => handleOpenSchedule(app)}
                    style={{ flex: "1 1 110px", padding: "7px 10px", borderRadius: 7, border: "1px solid #219EBC", color: "#219EBC", background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, textAlign: "center" }}
                  >
                    Schedule Exam
                  </button>
                  <button
                    onClick={() => handleOpenGrade(app)}
                    style={{ flex: "1 1 100px", padding: "7px 10px", borderRadius: 7, border: "1px solid #FFB703", color: "#FFB703", background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, textAlign: "center" }}
                  >
                    Grade Exam
                  </button>
                  {app.status !== "admitted" && app.status !== "rejected" && (
                    <>
                      <button
                        onClick={() => handleApprove(app.id)}
                        style={{ flex: "1 1 80px", padding: "7px 10px", borderRadius: 7, border: "none", color: "white", background: "#2a9d8f", cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(app.id)}
                        style={{ flex: "1 1 80px", padding: "7px 10px", borderRadius: 7, border: "none", color: "white", background: "#e76f51", cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handlePrintCard(app)}
                    style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.12)" : "#dde3e8"}`, color: "inherit", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11.5 }}
                  >
                    <Printer size={13} /> Card
                  </button>
                  {app.status === "admitted" && app.admission_number && (
                    <button
                      onClick={() => handlePrintAdmissionLetter(app)}
                      style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #2a9d8f", color: "#2a9d8f", background: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <FileText size={13} /> Letter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </Glass>

      {/* MODAL 1: GRADE EXAM */}
      {showGradeModal && selectedApp && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(1, 18, 29, 0.55)", backdropFilter: "blur(6px)"
        }}>
          <Glass style={{ width: "100%", maxWidth: "420px", background: theme === "dark" ? "#021625" : "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Grade Entrance Exam</h3>
              <button onClick={() => setShowGradeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ fontSize: 13, color: "#5a7f92", marginBottom: 20 }}>
              Entering scores for <strong>{selectedApp.child_first_name} {selectedApp.child_last_name}</strong> (App No: {selectedApp.application_number})
            </div>

            <form onSubmit={handleGradeSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>English Score (0 - 100)</label>
                <input 
                  type="number" min={0} max={100} required
                  value={scoreEng} onChange={(e) => setScoreEng(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Mathematics Score (0 - 100)</label>
                <input 
                  type="number" min={0} max={100} required
                  value={scoreMath} onChange={(e) => setScoreMath(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>General Paper Score (0 - 100)</label>
                <input 
                  type="number" min={0} max={100} required
                  value={scoreGen} onChange={(e) => setScoreGen(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                />
              </div>

              <button 
                type="submit" disabled={gradeLoading}
                style={{
                  width: "100%", padding: "12px", border: "none", borderRadius: 8, background: "#fb8500",
                  color: "white", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 6
                }}
              >
                {gradeLoading ? "Saving Grades..." : "Save Scores & Mark Completed"}
              </button>
            </form>
          </Glass>
        </div>
      )}

      {/* MODAL 2: SCHEDULE EXAM */}
      {showScheduleModal && selectedApp && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(1, 18, 29, 0.55)", backdropFilter: "blur(6px)"
        }}>
          <Glass style={{ width: "100%", maxWidth: "420px", background: theme === "dark" ? "#021625" : "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Schedule Exam Card</h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: "#5a7f92", marginBottom: 20 }}>
              Edit schedule for <strong>{selectedApp.child_first_name} {selectedApp.child_last_name}</strong> (App No: {selectedApp.application_number})
            </div>

            <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Exam Type</label>
                <select 
                  value={examType} onChange={(e) => setExamType(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                >
                  <option value="entrance">Entrance Exam</option>
                  <option value="supplementary">Supplementary Exam</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Date & Time</label>
                <input 
                  type="datetime-local" required
                  value={examDate} onChange={(e) => setExamDate(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Venue</label>
                <input 
                  type="text" required placeholder="e.g. Main Auditorium"
                  value={examVenue} onChange={(e) => setExamVenue(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Seat Number</label>
                <input 
                  type="text" required placeholder="e.g. SEAT-102"
                  value={examSeat} onChange={(e) => setExamSeat(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                    background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                    color: "inherit", outline: "none"
                  }}
                />
              </div>

              <button 
                type="submit" disabled={scheduleLoading}
                style={{
                  width: "100%", padding: "12px", border: "none", borderRadius: 8, background: "#219EBC",
                  color: "white", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 6
                }}
              >
                {scheduleLoading ? "Updating Schedule..." : "Save Schedule Details"}
              </button>
            </form>
          </Glass>
        </div>
      )}

    </div>
  );
}
