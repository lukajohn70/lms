import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  GraduationCap, CreditCard, FileText, CheckCircle, Clock,
  Printer, X, Landmark, Smartphone, User, Mail, Phone, MapPin, Briefcase, School
} from "lucide-react";
import { apiClient, API_BASE_URL } from "../../lib/apiClient";
import { useApp } from "../../contexts/AppContext";

const BACKEND_URL = API_BASE_URL.replace('/index.php', '/');

// Reusable Glassmorphism Card
const Glass = ({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) => {
  const { theme } = useApp();
  return (
    <div
      onClick={onClick}
      style={{
        background: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.85)",
        border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(33,158,188,0.12)"}`,
        backdropFilter: "blur(20px)",
        borderRadius: 16,
        padding: "24px",
        boxShadow: theme === "dark" ? "0 8px 32px rgba(0,0,0,0.2)" : "0 8px 32px rgba(2, 48, 71, 0.04)",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        ...style
      }}
    >
      {children}
    </div>
  );
};

// Fee Schedule by Grade Group
const FEE_SCHEDULES: Record<string, { tuition: number; development: number; library: number; materials: number; total: number }> = {
  nursery: { tuition: 45000, development: 10000, library: 5000, materials: 15000, total: 75000 },
  primary: { tuition: 65000, development: 15000, library: 8000, materials: 20000, total: 108000 },
  secondary: { tuition: 85000, development: 20000, library: 12000, materials: 25000, total: 142000 }
};

const getGradeGroup = (grade: string): string => {
  const g = grade.toLowerCase();
  if (g.includes("creche") || g.includes("nursery")) return "nursery";
  if (g.includes("primary")) return "primary";
  return "secondary";
};

export default function ParentAdmissions() {
  const { theme, user, settings } = useApp();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<"payment" | "form" | "success">("payment");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | "ussd">("card");

  // Payment Form States
  const [paymentName, setPaymentName] = useState(user ? `${user.first_name} ${user.last_name}` : "");
  const [paymentCard, setPaymentCard] = useState("");
  const [paymentExpiry, setPaymentExpiry] = useState("");
  const [paymentCvv, setPaymentCvv] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [bankTxnRef, setBankTxnRef] = useState("");
  const [ussdBank, setUssdBank] = useState("GTBank (*737#)");
  const [ussdPhone, setUssdPhone] = useState("");
  const [ussdTxnRef, setUssdTxnRef] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  // Child Form States
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [childGender, setChildGender] = useState("Male");
  const [gradeLevel, setGradeLevel] = useState("Primary 1");
  const [previousSchool, setPreviousSchool] = useState("");
  const [parentPhone, setParentPhone] = useState(user?.phone || "");
  const [parentAddress, setParentAddress] = useState("");
  const [parentOccupation, setParentOccupation] = useState("");
  const [parentRelationship, setParentRelationship] = useState(user?.relationship || "Father");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [successData, setSuccessData] = useState<any | null>(null);
  const [passportImage, setPassportImage] = useState("");
  const [passportPreview, setPassportPreview] = useState("");
  const [searchParams] = useSearchParams();

  // Handle passport photo selection and base64 encoding
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPassportImage(base64String);
        setPassportPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (searchParams.get("apply") === "true") {
      resetForm();
      setShowWizard(true);
    }
  }, [searchParams]);

  // Accept Offer States
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptApp, setAcceptApp] = useState<any | null>(null);
  const [portalPassword, setPortalPassword] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptResult, setAcceptResult] = useState<any | null>(null);
  const [enrolledChildren, setEnrolledChildren] = useState<any[]>([]);

  // Load applications & active children
  const fetchAdmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const [admsData, childrenData] = await Promise.all([
        apiClient.get("/parent/admissions"),
        apiClient.get("/parent/children")
      ]);
      setApplications(admsData.applications || []);
      setEnrolledChildren(childrenData.active_children || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admissions applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.phone) setParentPhone(user.phone);
      if (user.relationship) setParentRelationship(user.relationship);
    }
  }, [user]);

  // Handle Payment Submit
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setTimeout(() => {
      let ref = "";
      if (paymentMethod === "card") {
        ref = "PAY-CARD-" + Math.floor(100000 + Math.random() * 900000);
      } else if (paymentMethod === "bank") {
        ref = bankTxnRef || ("PAY-BANK-" + Math.floor(100000 + Math.random() * 900000));
      } else {
        ref = ussdTxnRef || ("PAY-USSD-" + Math.floor(100000 + Math.random() * 900000));
      }
      setPaymentRef(ref);
      setPaymentLoading(false);
      setWizardStep("form");
    }, 1200);
  };

  // Handle Admission Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      const payload = {
        parent_id: user?.id,
        parent_first_name: user?.first_name,
        parent_last_name: user?.last_name,
        parent_email: user?.email,
        parent_phone: parentPhone,
        parent_address: parentAddress,
        parent_occupation: parentOccupation,
        parent_relationship: parentRelationship,
        child_first_name: childFirstName,
        child_last_name: childLastName,
        child_dob: childDob,
        child_gender: childGender,
        grade_level: gradeLevel,
        previous_school: previousSchool,
        previous_grade: gradeLevel,
        payment_reference: paymentRef,
        passport_image: passportImage
      };

      const data = await apiClient.post("/admissions/apply", payload);
      setSuccessData({
        ...payload,
        ...data,
        exam_type: "entrance"
      });
      setWizardStep("success");
      
      // Auto-generate form fee receipt
      handlePrintReceipt("10000", paymentRef, "Application Form Fee", `${childFirstName} ${childLastName}`);
      
      fetchAdmissions();
    } catch (err: any) {
      setFormError(err.message || "Unable to submit application. Please verify details.");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Accept Admission
  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptApp) return;
    setAcceptLoading(true);
    try {
      const data = await apiClient.post("/admissions/create-account", {
        application_number: acceptApp.application_number,
        password: portalPassword
      });
      setAcceptResult(data);
      
      // Auto-generate acceptance fee receipt
      const acceptanceFee = settings?.acceptance_fee_amount || "20000";
      const paymentRef = "PAY-ACCEPT-" + Math.floor(100000 + Math.random() * 900000);
      handlePrintReceipt(acceptanceFee, paymentRef, "Admission Acceptance Fee", `${acceptApp.child_first_name} ${acceptApp.child_last_name}`);
      
      fetchAdmissions();
    } catch (err: any) {
      alert(err.message || "Failed to create portal account.");
    } finally {
      setAcceptLoading(false);
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


  // Print Admission Letter (auto-generated when admitted)
  const handlePrintAdmissionLetter = (app: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const sessionYear = settings?.academic_session || "2026/2027";
    
    // Dynamic School Variables
    const sName = settings?.school_name || "Aroura Academy";
    const sAcronym = settings?.school_acronym || "AROURA";
    const sAddress = settings?.school_address || "12 Aroura Close, Victoria Island, Lagos, Nigeria";
    const sPhone = settings?.school_phone || "+234 801 234 5678";
    const sEmail = settings?.school_email || "admissions@aroura.edu.ng";
    const sDirector = settings?.school_director_name || "Mrs M I. Okafor";
    const acceptanceFee = parseInt(settings?.acceptance_fee_amount || "20000").toLocaleString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Admission Letter - ${app.child_first_name} ${app.child_last_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@700;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'EB Garamond', Georgia, serif; color: #012030; background: #fff; }
            .page { max-width: 720px; margin: 0 auto; padding: 48px 56px; min-height: 100vh; position: relative; }
            .page::before { content: ''; position: absolute; inset: 18px; border: 2.5px solid #219EBC; pointer-events: none; }
            .page::after { content: ''; position: absolute; inset: 22px; border: 1px solid rgba(33,158,188,0.25); pointer-events: none; }
            .header { display: flex; align-items: center; gap: 18px; padding-bottom: 18px; border-bottom: 2px solid #219EBC; margin-bottom: 28px; }
            .logo { width: 70px; height: 70px; border-radius: 14px; flex-shrink: 0; }
            .school-info { flex: 1; }
            .school-name { font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 800; color: #012030; letter-spacing: 0.5px; text-transform: uppercase; }
            .school-tagline { font-size: 12px; color: #fb8500; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
            .school-contact { font-size: 11px; color: #5a7f92; margin-top: 5px; line-height: 1.6; }
            .ref-block { text-align: right; font-size: 12px; color: #5a7f92; line-height: 1.8; }
            .letter-title { text-align: center; margin-bottom: 28px; }
            .letter-title h2 { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #012030; background: rgba(33,158,188,0.08); display: inline-block; padding: 8px 28px; border-radius: 4px; border-bottom: 2px solid #219EBC; }
            .salutation { font-size: 15px; line-height: 1.8; margin-bottom: 14px; }
            .body-text { font-size: 14.5px; line-height: 1.85; margin-bottom: 16px; text-align: justify; }
            .info-table { width: 100%; border-collapse: collapse; margin: 22px 0; font-size: 13.5px; }
            .info-table tr { border-bottom: 1px dashed rgba(33,158,188,0.2); }
            .info-table tr:first-child { border-top: 1px solid rgba(33,158,188,0.2); }
            .info-table td { padding: 9px 14px; vertical-align: top; }
            .info-table td:first-child { font-weight: 700; color: #5a7f92; width: 40%; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.3px; }
            .info-table td:last-child { font-weight: 600; color: #012030; font-size: 14px; }
            .adm-number { font-size: 20px; font-family: 'Montserrat', sans-serif; font-weight: 800; color: #fb8500; }
            .instruction-box { background: rgba(33,158,188,0.05); border-left: 4px solid #219EBC; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .instruction-box h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #219EBC; font-weight: 700; margin-bottom: 8px; }
            .instruction-box ol { padding-left: 18px; }
            .instruction-box li { font-size: 13px; line-height: 1.7; margin-bottom: 4px; }
            .fee-note { background: rgba(251,133,0,0.06); border: 1px solid rgba(251,133,0,0.2); border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; line-height: 1.6; }
            .fee-note strong { color: #fb8500; }
            .signature-block { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sign-left { font-size: 13.5px; line-height: 1.7; }
            .sign-line { width: 200px; border-bottom: 1.5px solid #012030; margin-bottom: 5px; height: 36px; }
            .sign-label { font-size: 11.5px; color: #5a7f92; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
            .stamp-circle { width: 80px; height: 80px; border-radius: 50%; border: 3px double #219EBC; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center; color: #219EBC; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4; }
            .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid rgba(33,158,188,0.2); text-align: center; font-size: 10.5px; color: #b5c7d3; line-height: 1.6; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <img src="${window.location.origin}/logo.png" class="logo" alt="${sName}" onerror="this.style.display='none'" />
              <div class="school-info">
                <div class="school-name">${sName}</div>
                <div class="school-tagline">Excellence in Education</div>
                <div class="school-contact">
                  📍 ${sAddress} &nbsp;|&nbsp; 📞 ${sPhone} &nbsp;|&nbsp; ✉ ${sEmail}
                </div>
              </div>
              <div class="ref-block">
                <div><strong>Ref:</strong> ${sAcronym}/ADM/${app.admission_number}</div>
                <div><strong>Date:</strong> ${today}</div>
                <div><strong>Session:</strong> ${sessionYear}</div>
              </div>
            </div>

            <div class="letter-title">
              <h2>Offer of Provisional Admission</h2>
            </div>

            <p class="salutation">
              Dear <strong>${app.child_first_name} ${app.child_last_name}</strong>,
            </p>

            <p class="body-text">
              With reference to the outcome of the entrance examination you sat for, we are glad to inform you that you have been offered admission into <strong>${app.grade_level}</strong> at ${sName}.
            </p>

            <table class="info-table">
              <tr><td>Candidate's Full Name</td><td>${app.child_first_name} ${app.child_last_name}</td></tr>
              <tr><td>Class Admitted Into</td><td>${app.grade_level} — ${sessionYear} Session</td></tr>
              <tr><td>Parent / Guardian</td><td>${app.parent_first_name} ${app.parent_last_name} (${app.parent_relationship})</td></tr>
            </table>

            <p class="body-text">
              On receipt of this letter, you are requested to pay a non-refundable acceptance fee of <strong>₦${acceptanceFee}</strong> via the Parent Portal. This fee forms part of the total school fees and secures your admission slot.
            </p>
            <p class="body-text">
              You are also requested to be present with a guardian/parent with the following documents at the time of registration and fees payment:
            </p>

            <div class="instruction-box">
              <h4>Required Documents for Registration</h4>
              <ol>
                <li>Primary School Certificate / Testimonial</li>
                <li>Original Birth Certificate</li>
                <li>Printed Admission Letter</li>
              </ol>
            </div>

            <div class="fee-note">
              ⚠ Please note that this offer of admission is valid for <strong>14 days from the date of this letter</strong>. ${sName} reserves the right to offer the position to another candidate if the acceptance fee is not paid within this window.
            </div>

            <p class="body-text">
              Attached to your dashboard is a breakdown that has all the necessary details of fees and other requirements to complete your enrolment process. 
            </p>
            <p class="body-text">
              Thank you for your interest in our school and we hope to see you soon! Congratulations once again as we welcome you to the ${sName} Family.
            </p>
            <p class="body-text">Best regards.</p>

            <div class="signature-block">
              <div class="sign-left">
                <div class="sign-line"></div>
                <div style="font-weight:700;font-size:14px;">${sDirector}</div>
                <div class="sign-label">Director</div>
              </div>
              <div class="stamp-circle">${sAcronym}<br/>OFFICIAL<br/>SEAL</div>
            </div>

            <div class="footer">
              This is an officially generated document by the ${sName} Management System.<br/>
              For verification, contact ${sEmail} or call ${sPhone}.
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
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

  // Reset form helper
  const resetForm = () => {
    setChildFirstName("");
    setChildLastName("");
    setChildDob("");
    setChildGender("Male");
    setGradeLevel("Primary 1");
    setPreviousSchool("");
    setParentPhone("");
    setParentAddress("");
    setParentOccupation("");
    setParentRelationship("Father");
    setWizardStep("payment");
    setPaymentCard("");
    setPaymentExpiry("");
    setPaymentCvv("");
    setBankTxnRef("");
    setUssdTxnRef("");
    setPaymentRef("");
    setSuccessData(null);
    setPassportImage("");
    setPassportPreview("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Children Admissions</h1>
          <p style={{ margin: "4px 0 0", color: "#5a7f92", fontSize: 14 }}>Apply for new child admissions, track ongoing applications, and accept admission offers.</p>
        </div>
      </div>

      {/* ── WIZARD MODE ── */}
      {showWizard && (
        <Glass style={{ position: "relative" }}>
          {/* Close wizard button */}
          <button
            onClick={() => { setShowWizard(false); resetForm(); }}
            style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <X size={20} />
          </button>

          {/* Stepper headers */}
          {wizardStep !== "success" && (
            <div style={{ display: "flex", gap: 24, marginBottom: 28, borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: wizardStep === "payment" ? "#219EBC" : "#2a9d8f",
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700
                }}>
                  {wizardStep === "payment" ? "1" : "✓"}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: wizardStep === "payment" ? "var(--heading)" : "var(--subtext)" }}>Application Payment</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: wizardStep === "form" ? "#219EBC" : "rgba(142,202,230,0.15)",
                  color: wizardStep === "form" ? "white" : "var(--subtext)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700
                }}>
                  2
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: wizardStep === "form" ? "var(--heading)" : "var(--subtext)" }}>Candidate Details</span>
              </div>
            </div>
          )}

          {/* WIZARD STEP 1: PAYMENT */}
          {wizardStep === "payment" && (
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "10px 0" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <CreditCard size={24} style={{ color: "#219EBC" }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Application Form Payment</h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--subtext)", margin: "0 0 20px" }}>
                To purchase an admission form, you are required to pay a non-refundable application fee of <strong>₦10,000</strong>. Your transaction will be processed securely.
              </p>

              {/* Payment Tabs - only show admin-enabled methods */}
              {(() => {
                const allTabs = [
                  { id: "card", label: "💳 Card Payment", settingKey: "pay_method_card" },
                  { id: "bank", label: "🏦 Bank Transfer", settingKey: "pay_method_bank" },
                  { id: "ussd", label: "📱 USSD Code", settingKey: "pay_method_ussd" }
                ];
                // If settings not loaded yet, or no keys set, show all; else filter
                const enabledTabs = allTabs.filter(t =>
                  !settings || settings[t.settingKey] === undefined || settings[t.settingKey] === "1"
                );
                // If current method got disabled, reset to first enabled
                if (enabledTabs.length > 0 && !enabledTabs.find(t => t.id === paymentMethod)) {
                  setPaymentMethod(enabledTabs[0].id as any);
                }
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {enabledTabs.map(tab => (
                      <button
                        key={tab.id} type="button"
                        onClick={() => setPaymentMethod(tab.id as any)}
                        style={{
                          flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                          background: paymentMethod === tab.id
                            ? "linear-gradient(135deg, #219EBC 0%, #023047 100%)"
                            : (theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(2,48,71,0.05)"),
                          color: paymentMethod === tab.id ? "white" : "var(--subtext)",
                          border: paymentMethod === tab.id ? "none" : `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Pending-verification notice for manual payment methods */}
              {(paymentMethod === "bank" || paymentMethod === "ussd") && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: "rgba(255,183,3,0.08)",
                  border: "1px solid rgba(255,183,3,0.3)",
                  borderRadius: 10, padding: "12px 14px", marginBottom: 8
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>⏳</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#FFB703", marginBottom: 3 }}>Payment Pending Verification</div>
                    <div style={{ fontSize: 12, color: "var(--subtext)", lineHeight: 1.55 }}>
                      After submitting your details, your payment will be <strong>reviewed and verified by the Accounts Department</strong>. This may take <strong>1–2 business days</strong>. Your application will proceed once payment is confirmed.
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {paymentMethod === "card" && (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Cardholder Full Name</label>
                      <input
                        type="text" required
                        placeholder="e.g. John Doe" value={paymentName} onChange={(e) => setPaymentName(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Card Number</label>
                      <input
                        type="text" required placeholder="4111 2222 3333 4444"
                        value={paymentCard} onChange={(e) => setPaymentCard(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Expiry Date</label>
                        <input
                          type="text" required placeholder="MM/YY"
                          value={paymentExpiry} onChange={(e) => setPaymentExpiry(e.target.value)}
                          style={{
                            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                            background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                            border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                            color: "inherit", outline: "none"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>CVV</label>
                        <input
                          type="password" required maxLength={3} placeholder="123"
                          value={paymentCvv} onChange={(e) => setPaymentCvv(e.target.value)}
                          style={{
                            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                            background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                            border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                            color: "inherit", outline: "none"
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === "bank" && (
                  <>
                    <div style={{ background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.2)", borderRadius: 10, padding: 14, fontSize: 12.5, lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 700, color: "#219EBC", marginBottom: 6 }}>Transfer Instructions:</div>
                      <div>Bank: <strong>Guaranty Trust Bank (GTBank)</strong></div>
                      <div>Account Name: <strong>Aroura Academy Admissions</strong></div>
                      <div>Account Number: <strong style={{ fontSize: 14, color: "#fb8500" }}>0123456789</strong></div>
                      <div style={{ marginTop: 6, fontStyle: "italic", opacity: 0.8 }}>Please transfer exactly <strong>₦10,000</strong> to the account above, then fill in your transfer details below to verify.</div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Sender Bank Name</label>
                      <input
                        type="text" required placeholder="e.g. Zenith Bank"
                        value={senderBank} onChange={(e) => setSenderBank(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Sender Account Name</label>
                      <input
                        type="text" required placeholder="e.g. Jane Doe"
                        value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Transaction Reference / Code</label>
                      <input
                        type="text" required placeholder="e.g. TXN-984729184"
                        value={bankTxnRef} onChange={(e) => setBankTxnRef(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                  </>
                )}

                {paymentMethod === "ussd" && (
                  <>
                    <div style={{ background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.2)", borderRadius: 10, padding: 14, fontSize: 12.5, lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 700, color: "#219EBC", marginBottom: 6 }}>Dial USSD Code:</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#fb8500", textAlign: "center", margin: "10px 0" }}>*737*1*2*10000#</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>Dial the code above from your bank-registered phone to pay ₦10,000. Enter transaction info below.</div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Select Bank</label>
                      <select
                        value={ussdBank} onChange={(e) => setUssdBank(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                          background: theme === "dark" ? "#021625" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      >
                        <option>GTBank (*737#)</option>
                        <option>Access Bank (*901#)</option>
                        <option>UBA (*919#)</option>
                        <option>Zenith Bank (*966#)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Registered Phone Number</label>
                      <input
                        type="tel" required placeholder="e.g. 08031234567"
                        value={ussdPhone} onChange={(e) => setUssdPhone(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>USSD Session ID / Reference</label>
                      <input
                        type="text" required placeholder="e.g. USSD-738927"
                        value={ussdTxnRef} onChange={(e) => setUssdTxnRef(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit" disabled={paymentLoading}
                  style={{
                    width: "100%", padding: "13px", background: "#219EBC", color: "white",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8
                  }}
                >
                  {paymentLoading ? "Confirming Gateway Transaction..." : "Confirm Payment ₦10,000"}
                </button>
              </form>
            </div>
          )}

          {/* WIZARD STEP 2: DETAILS FORM */}
          {wizardStep === "form" && (
            <div style={{ maxWidth: 650, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <School size={22} style={{ color: "#fb8500" }} />
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Candidate & Parent Information</h3>
              </div>

              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Parent Section */}
                <div>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#fb8500", margin: "0 0 10px", textTransform: "uppercase" }}>1. Parent Contact Details</h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>First Name (Prefilled)</label>
                      <input type="text" readOnly value={user?.first_name || ""} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.7 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Last Name (Prefilled)</label>
                      <input type="text" readOnly value={user?.last_name || ""} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.7 }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Phone Number</label>
                      <input
                        type="tel" required placeholder="+234..."
                        value={parentPhone} onChange={(e) => setParentPhone(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Email Address</label>
                      <input type="email" readOnly value={user?.email || ""} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", opacity: 0.7 }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Occupation</label>
                      <input
                        type="text" placeholder="e.g. Engineer"
                        value={parentOccupation} onChange={(e) => setParentOccupation(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Relationship to Child</label>
                      <select
                        value={parentRelationship} onChange={(e) => setParentRelationship(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "#021625" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      >
                        <option>Father</option>
                        <option>Mother</option>
                        <option>Guardian</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Residential Address</label>
                    <input
                      type="text" required placeholder="Street Name, City, State"
                      value={parentAddress} onChange={(e) => setParentAddress(e.target.value)}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                        background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                        border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                        color: "inherit", outline: "none"
                      }}
                    />
                  </div>
                </div>

                {/* Child Section */}
                <div style={{ borderTop: `1px dashed ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, paddingTop: 18 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#fb8500", margin: "0 0 10px", textTransform: "uppercase" }}>2. Candidate Information</h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Child's First Name</label>
                      <input
                        type="text" required placeholder="e.g. Kola"
                        value={childFirstName} onChange={(e) => setChildFirstName(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Child's Last Name</label>
                      <input
                        type="text" required placeholder="e.g. Adesina"
                        value={childLastName} onChange={(e) => setChildLastName(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Date of Birth</label>
                      <input
                        type="date" required
                        value={childDob} onChange={(e) => setChildDob(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Gender</label>
                      <select
                        value={childGender} onChange={(e) => setChildGender(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "#021625" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      >
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Class Applying For</label>
                      <select
                        value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "#021625" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      >
                        <option>Creche</option>
                        <option>Nursery 1</option>
                        <option>Nursery 2</option>
                        <option>Primary 1</option>
                        <option>Primary 2</option>
                        <option>Primary 3</option>
                        <option>Primary 4</option>
                        <option>Primary 5</option>
                        <option>Primary 6</option>
                        <option>JSS 1</option>
                        <option>JSS 2</option>
                        <option>JSS 3</option>
                        <option>SSS 1</option>
                        <option>SSS 2</option>
                        <option>SSS 3</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Previous School (If any)</label>
                      <input
                        type="text" placeholder="e.g. Hope Academy"
                        value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                          background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                          border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                          color: "inherit", outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12, marginTop: 12 }}>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>Passport Photograph (Required)</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handlePhotoChange}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box",
                        background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                        border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                        color: "inherit", outline: "none"
                      }}
                    />
                    {passportPreview && (
                      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                        <img
                          src={passportPreview}
                          alt="Passport Preview"
                          style={{ width: 80, height: 90, objectFit: "cover", borderRadius: 8, border: "2px solid #219EBC" }}
                        />
                        <span style={{ fontSize: 12, color: "var(--subtext)" }}>Candidate photograph selected.</span>
                      </div>
                    )}
                  </div>
                </div>

                {formError && (
                  <div style={{ color: "#e76f51", fontSize: 12.5, fontWeight: 600 }}>⚠ {formError}</div>
                )}

                <button
                  type="submit" disabled={formLoading}
                  style={{
                    width: "100%", padding: "13px", background: "#fb8500", color: "white",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8
                  }}
                >
                  {formLoading ? "Submitting Application Details..." : "Submit Admission Application"}
                </button>
              </form>
            </div>
          )}

          {/* WIZARD STEP 3: SUCCESS */}
          {wizardStep === "success" && successData && (
            <div style={{ textAlign: "center", padding: "20px 0", maxWidth: 480, margin: "0 auto" }}>
              <CheckCircle size={56} style={{ color: "#2a9d8f", marginBottom: 20 }} />
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Application Submitted!</h3>
              <p style={{ fontSize: 14, color: "var(--subtext)", lineHeight: 1.5, marginBottom: 24 }}>
                Your application for <strong>{childFirstName} {childLastName}</strong> has been registered successfully.
              </p>

              <div style={{ background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.18)", borderRadius: 10, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtext)", textTransform: "uppercase", marginBottom: 4 }}>Application Number</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fb8500" }}>{successData.application_number}</div>
              </div>

              <div style={{ border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, borderRadius: 10, padding: 18, textAlign: "left", marginBottom: 24 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#219EBC" }}>Entrance Examination Schedule</h4>
                <div style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text)" }}>
                  <div>Date: <strong>{new Date(successData.exam_date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
                  <div>Time: <strong>{new Date(successData.exam_date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  <div>Venue: <strong>{successData.exam_venue}</strong></div>
                  <div>Seat Number: <strong style={{ color: "#fb8500" }}>{successData.exam_seat_number}</strong></div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 14 }}>
                <button
                  onClick={() => handlePrintCard(successData)}
                  style={{
                    flex: 1, padding: "12px", background: "#219EBC", color: "white",
                    border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  <Printer size={16} /> Print Exam Card
                </button>
                <button
                  onClick={() => { setShowWizard(false); resetForm(); }}
                  style={{
                    flex: 0.8, padding: "12px", background: "none", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.15)" : "#dde3e8"}`,
                    color: "inherit", borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: "pointer"
                  }}
                >
                  View My Applications
                </button>
              </div>
            </div>
          )}
        </Glass>
      )}

      {/* ── APPLICATIONS OVERVIEW LIST ── */}
      {!showWizard && (
        <>
          {/* Active Enrolled Children */}
          {enrolledChildren.length > 0 && (
            <Glass style={{ padding: 24, marginBottom: 4 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px", color: "var(--heading)", textTransform: "uppercase", letterSpacing: "0.04em" }}>✅ Currently Enrolled Children</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
                {enrolledChildren.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(42,157,143,0.06)", border: "1px solid rgba(42,157,143,0.2)", borderRadius: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #2a9d8f, #219EBC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>
                      {(c.first_name?.[0] || "") + (c.last_name?.[0] || "")}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--heading)" }}>{c.first_name} {c.last_name}</h4>
                      <span style={{ fontSize: 11, color: "#2a9d8f", fontWeight: 700 }}>
                        {c.current_class || c.grade_level || "Active Student"} · Enrolled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--subtext)" }}>Loading admission history...</div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: "center", color: "#e76f51" }}>⚠ {error}</div>
          ) : applications.length === 0 ? (
            <Glass style={{ padding: 40, textAlign: "center" }}>
              <School size={48} style={{ color: "#219EBC", marginBottom: 16, opacity: 0.8 }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>
                {enrolledChildren.length > 0 ? "No Pending Applications" : "No Applications Yet"}
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--subtext)", margin: "0 0 20px", maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
                {enrolledChildren.length > 0
                  ? "All your previous applications have been processed. Click below to start a new application for an additional child."
                  : "You have not submitted any child admission applications yet. Click the button below to purchase an admission form and register a candidate."}
              </p>
              <button
                onClick={() => { resetForm(); setShowWizard(true); }}
                style={{
                  padding: "10px 18px", borderRadius: 8, background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)", color: "white",
                  border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                  boxShadow: "0 6px 20px rgba(33,158,188,0.22)"
                }}
              >
                {enrolledChildren.length > 0 ? "Apply for Another Child" : "Apply for First Child"}
              </button>
            </Glass>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* History heading + new application button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--heading)" }}>Admission History</h2>
                  <p style={{ fontSize: 12, color: "var(--subtext)", margin: "3px 0 0" }}>{applications.length} application{applications.length !== 1 ? "s" : ""} found</p>
                </div>
                <button
                  onClick={() => { resetForm(); setShowWizard(true); }}
                  style={{
                    padding: "9px 16px", borderRadius: 8, background: "linear-gradient(135deg, #219EBC 0%, #023047 100%)",
                    color: "white", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12.5,
                    boxShadow: "0 4px 14px rgba(33,158,188,0.22)", display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  + Apply for New Child
                </button>
              </div>
              {applications.map(app => {
                const isAdmitted = app.status === "admitted";
                const isGraded = app.status === "exam_completed" || isAdmitted;
                const hasExam = app.exam_date;
                const gradeGroup = getGradeGroup(app.grade_level);
                const fees = FEE_SCHEDULES[gradeGroup] || FEE_SCHEDULES.primary;

                return (
                  <Glass key={app.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "#dde3e8"}`, paddingBottom: 12 }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        {app.passport_path && (
                          <img
                            src={BACKEND_URL + app.passport_path}
                            alt="Candidate"
                            style={{ width: 44, height: 50, objectFit: "cover", borderRadius: 8, border: "1.5px solid rgba(33,158,188,0.2)" }}
                          />
                        )}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fb8500", textTransform: "uppercase", letterSpacing: "0.05em" }}>Candidate Application</span>
                          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "3px 0 0" }}>{app.child_first_name} {app.child_last_name}</h3>
                          <div style={{ fontSize: 12.5, color: "var(--subtext)", marginTop: 4 }}>
                            Class: <strong>{app.grade_level}</strong> | DOB: <strong>{app.child_dob}</strong>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#219EBC" }}>{app.application_number}</div>
                        <div style={{ marginTop: 4 }}>{getStatusBadge(app.status)}</div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="parent-grid-layout">
                      {/* Left: Exam Details */}
                      <div>
                        <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--heading)", textTransform: "uppercase" }}>Exam Information</h4>
                        {hasExam ? (
                          <div style={{ background: "rgba(255,255,255,0.02)", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "#dde3e8"}`, borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "grid", gap: 5, fontSize: 12.5, color: "var(--text)" }}>
                              <div>Type: <strong style={{ textTransform: "capitalize" }}>{app.exam_type} Exam</strong></div>
                              <div>Date: <strong>{new Date(app.exam_date).toLocaleDateString()}</strong></div>
                              <div>Time: <strong>{new Date(app.exam_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                              <div>Venue: <strong>{app.exam_venue || "Main Auditorium"}</strong></div>
                              <div>Seat: <strong style={{ color: "#fb8500" }}>{app.exam_seat_number || "SEAT-100"}</strong></div>
                            </div>
                            <button
                              onClick={() => handlePrintCard(app)}
                              style={{
                                marginTop: 12, padding: "6px 12px", background: "none", color: "#219EBC",
                                border: "1px solid #219EBC", borderRadius: 6, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                marginBottom: 12
                              }}
                            >
                              <Printer size={13} /> Print Exam Card
                            </button>

                            {/* Study Guide Download Section */}
                            <div style={{ background: "rgba(255,183,3,0.06)", border: "1px solid rgba(255,183,3,0.18)", borderRadius: 10, padding: 12 }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                                <FileText size={14} style={{ color: "#FFB703" }} />
                                <strong style={{ fontSize: 12.5, color: "var(--heading)" }}>Admissions Study Guide</strong>
                              </div>
                              <p style={{ fontSize: 11, color: "var(--subtext)", margin: "0 0 10px", lineHeight: 1.4 }}>
                                View study materials to prepare for the {app.grade_level} entrance exam.
                              </p>
                              <a
                                href={`/study_guides/${getGradeGroup(app.grade_level)}_guide.pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px",
                                  background: "#FFB703", color: "#011d2f", borderRadius: 6, fontSize: 11.5,
                                  fontWeight: 700, textDecoration: "none"
                                }}
                              >
                                View Study Guide (PDF)
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "var(--subtext)", fontStyle: "italic" }}>
                            Exam schedule has not been finalized yet.
                          </div>
                        )}
                      </div>

                      {/* Right: Scores */}
                      <div>
                        <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--heading)", textTransform: "uppercase" }}>Grading & Score Details</h4>
                        {isGraded ? (
                          <div style={{ background: "rgba(255,255,255,0.02)", border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.05)" : "#dde3e8"}`, borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span>English Language:</span>
                                <strong>{app.score_english}%</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span>Mathematics:</span>
                                <strong>{app.score_math}%</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span>General Knowledge:</span>
                                <strong>{app.score_general}%</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: `1px dashed ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, paddingTop: 8, fontWeight: 700, color: "#fb8500" }}>
                                <span>Aggregate Average:</span>
                                <span>{((app.score_english + app.score_math + app.score_general) / 3).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "var(--subtext)", fontStyle: "italic" }}>
                            Exam results will be displayed here once grading is complete.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admitted Offer Block */}
                    {isAdmitted && (
                      <div style={{
                        marginTop: 8, background: "rgba(42, 157, 143, 0.06)", border: "1px solid rgba(42, 157, 143, 0.22)",
                        borderRadius: 12, padding: 18
                      }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <CheckCircle size={20} style={{ color: "#2a9d8f", flexShrink: 0, marginTop: 2 }} />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#2a9d8f" }}>Admission Offer Granted!</h4>
                            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>
                              Congratulations! <strong>{app.child_first_name} {app.child_last_name}</strong> has been offered admission for the 2026/2027 academic session.
                              Please review the fee schedule below and accept the offer to activate their portal account.
                            </p>

                            {/* Tuition fee schedule details */}
                            <div style={{ overflowX: "auto", marginBottom: 16 }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, textAlign: "left" }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, opacity: 0.7 }}>
                                    <th style={{ padding: "4px 8px" }}>Fee Item</th>
                                    <th style={{ padding: "4px 8px", textAlign: "right" }}>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "6px 8px" }}>Tuition Fee</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>₦{fees.tuition.toLocaleString()}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: "6px 8px" }}>Development Levy</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>₦{fees.development.toLocaleString()}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: "6px 8px" }}>Library & ICT Resource</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>₦{fees.library.toLocaleString()}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: "6px 8px" }}>Learning Materials & Books</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>₦{fees.materials.toLocaleString()}</td>
                                  </tr>
                                  <tr style={{ borderTop: `1px dashed ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`, fontWeight: 700 }}>
                                    <td style={{ padding: "8px 8px" }}>Total Termly Fees</td>
                                    <td style={{ padding: "8px 8px", textAlign: "right", color: "#fb8500" }}>₦{fees.total.toLocaleString()}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {app.admission_number ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {/* Admission Letter Banner */}
                                <div style={{
                                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                                  background: "rgba(42,157,143,0.06)", border: "1px solid rgba(42,157,143,0.2)",
                                  borderRadius: 8, fontSize: 12.5
                                }}>
                                  <FileText size={16} style={{ color: "#2a9d8f", flexShrink: 0 }} />
                                  <span style={{ color: "var(--text)", lineHeight: 1.4 }}>
                                    Your <strong>Admission Letter</strong> has been automatically generated.
                                    Download and present it on the first day of resumption.
                                  </span>
                                </div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                  <div style={{ fontSize: 12.5, alignSelf: "center", opacity: 0.7 }}>
                                    Admission ID: <strong style={{ color: "#2a9d8f" }}>{app.admission_number}</strong>
                                  </div>

                                  {/* Download Admission Letter */}
                                  <button
                                    onClick={() => handlePrintAdmissionLetter(app)}
                                    style={{
                                      padding: "8px 16px", borderRadius: 8,
                                      background: "linear-gradient(135deg, #2a9d8f 0%, #219EBC 100%)",
                                      color: "white", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                                      boxShadow: "0 4px 12px rgba(42,157,143,0.3)",
                                      display: "flex", alignItems: "center", gap: 6
                                    }}
                                  >
                                    <FileText size={14} /> Download Admission Letter
                                  </button>

                                  {/* Accept Offer Button */}
                                  <button
                                    onClick={() => { setAcceptApp(app); setPortalPassword(""); setAcceptResult(null); setShowAcceptModal(true); }}
                                    style={{
                                      padding: "8px 16px", borderRadius: 8, background: "none", color: "#2a9d8f",
                                      border: "1.5px solid #2a9d8f", cursor: "pointer", fontSize: 12.5, fontWeight: 700
                                    }}
                                  >
                                    Accept Offer & Setup Portal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>Awaiting admission number allocation...</span>
                            )}


                          </div>
                        </div>
                      </div>
                    )}
                  </Glass>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL: ACCEPT OFFER & SET PASSWORD */}
      {showAcceptModal && acceptApp && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(1, 18, 29, 0.55)", backdropFilter: "blur(6px)"
        }}>
          <Glass style={{ width: "100%", maxWidth: "420px", background: theme === "dark" ? "#021625" : "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Accept Admission Offer</h3>
              <button onClick={() => setShowAcceptModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
                <X size={18} />
              </button>
            </div>

            {!acceptResult ? (
              <form onSubmit={handleAcceptSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 13, color: "var(--subtext)", lineHeight: 1.5 }}>
                  Setting up a portal account for <strong>{acceptApp.child_first_name} {acceptApp.child_last_name}</strong>.
                  This will generate their Aroura Academy student credentials.
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Set Student Portal Password</label>
                  <input
                    type="password" required minLength={6} placeholder="Minimum 6 characters"
                    value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box",
                      background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                      border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "#dde3e8"}`,
                      color: "inherit", outline: "none"
                    }}
                  />
                </div>

                <button
                  type="submit" disabled={acceptLoading}
                  style={{
                    width: "100%", padding: "12px", border: "none", borderRadius: 8, background: "#2a9d8f",
                    color: "white", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 6
                  }}
                >
                  {acceptLoading ? "Activating Student Profile..." : "Accept & Generate Login Credentials"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <CheckCircle size={48} style={{ color: "#2a9d8f", marginBottom: 16 }} />
                <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Portal Activated Successfully!</h4>
                <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: "0 0 16px" }}>
                  A student login profile has been generated. Use the details below to access their dashboard.
                </p>

                <div style={{ background: "rgba(33,158,188,0.08)", border: "1px solid rgba(33,158,188,0.18)", borderRadius: 10, padding: 14, textAlign: "left", fontSize: 13, display: "grid", gap: 6, marginBottom: 20 }}>
                  <div>Portal Role: <strong>Student</strong></div>
                  <div>Assigned Email: <strong style={{ color: "#219EBC" }}>{acceptResult.student_email}</strong></div>
                  <div>Password: <em>(The password you just configured)</em></div>
                </div>

                <button
                  onClick={() => setShowAcceptModal(false)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 8, background: "none",
                    color: "var(--heading)", fontWeight: 700, fontSize: 13, border: `1.5px solid ${theme === "dark" ? "rgba(255,255,255,0.15)" : "#dde3e8"}`,
                    cursor: "pointer"
                  }}
                >
                  Close Window
                </button>
              </div>
            )}
          </Glass>
        </div>
      )}

    </div>
  );
}
