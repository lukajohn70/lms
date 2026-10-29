import{u as J,r as o,j as e,b as x,A as le}from"./index-CCAgnLCA.js";import{F as v}from"./file-text-9LkGNU-k.js";import{C as ce}from"./calendar-C54WPhNX.js";import{A as ge}from"./award-Cu0akXmj.js";import{C as xe}from"./circle-check-big-BT0iRU37.js";import{S as pe}from"./search-V8bmDkEm.js";import{F as he}from"./funnel-BdrAgj02.js";import{C as fe}from"./clock-Dsd296Pv.js";import{P as Y}from"./printer-BcmWlRNE.js";import{X}from"./x-BGUApn_N.js";const j=le.replace("/index.php","/"),d=({children:i,style:a})=>{const{theme:p}=J();return e.jsx("div",{style:{background:p==="dark"?"rgba(255, 255, 255, 0.03)":"rgba(255, 255, 255, 0.8)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:`1px solid ${p==="dark"?"rgba(255,255,255,0.07)":"rgba(41,61,125,0.08)"}`,borderRadius:"16px",padding:"24px",boxShadow:"0 8px 32px rgba(2, 48, 71, 0.04)",...a},children:i})};function ze(){const{theme:i}=J(),[a,p]=o.useState([]),[Q,S]=o.useState(!0),[_,w]=o.useState(""),[c,Z]=o.useState(""),[h,ee]=o.useState("all"),[r,k]=o.useState(null),[te,f]=o.useState(!1),[ie,u]=o.useState(!1),[z,C]=o.useState(""),[A,E]=o.useState(""),[R,W]=o.useState(""),[T,$]=o.useState(!1),[L,I]=o.useState("entrance"),[m,b]=o.useState(""),[D,G]=o.useState(""),[N,F]=o.useState(""),[B,P]=o.useState(!1),l=async()=>{S(!0),w("");try{const t=await x.get("/admissions");p(t.applications||[])}catch(t){w(t.message||"Failed to load admissions.")}finally{S(!1)}};o.useEffect(()=>{l()},[]);const O=t=>{k(t),C(t.score_english!==null?t.score_english.toString():""),E(t.score_math!==null?t.score_math.toString():""),W(t.score_general!==null?t.score_general.toString():""),f(!0)},ne=async t=>{if(t.preventDefault(),!!r){$(!0);try{await x.post("/admissions/update",{id:r.id,score_english:parseInt(z)||0,score_math:parseInt(A)||0,score_general:parseInt(R)||0,status:"exam_completed"}),f(!1),l()}catch(n){alert(n.message||"Failed to submit scores.")}finally{$(!1)}}},M=t=>{if(k(t),I(t.exam_type||"entrance"),t.exam_date){const n=new Date(t.exam_date),s=new Date(n.getTime()-n.getTimezoneOffset()*6e4).toISOString();b(s.slice(0,16))}else b("");G(t.exam_venue||""),F(t.exam_seat_number||""),u(!0)},oe=async t=>{if(t.preventDefault(),!!r){P(!0);try{await x.post("/admissions/update",{id:r.id,exam_type:L,exam_date:m?m.replace("T"," ")+":00":null,exam_venue:D,exam_seat_number:N,status:"exam_scheduled"}),u(!1),l()}catch(n){alert(n.message||"Failed to update schedule.")}finally{P(!1)}}},H=async t=>{if(confirm("Are you sure you want to approve this candidate? This will automatically generate an Admission Number and send an offer."))try{await x.post("/admissions/approve",{id:t}),l()}catch(n){alert(n.message||"Failed to approve admission.")}},q=async t=>{if(confirm("Are you sure you want to reject this candidate?"))try{await x.post("/admissions/reject",{id:t}),l()}catch(n){alert(n.message||"Failed to reject application.")}},U=t=>{const n=window.open("","_blank");if(!n)return;const s=new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),g="2026/2027";n.document.write(`
      <html>
        <head>
          <title>Admission Letter - ${t.child_first_name} ${t.child_last_name}</title>
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <link rel="icon" type="image/png" href="/logo.png">
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
              border: 2.5px solid #293d7d;
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
            .header { display: flex; align-items: center; gap: 18px; padding-bottom: 18px; border-bottom: 2px solid #293d7d; margin-bottom: 28px; }
            .logo { width: 70px; height: 70px; border-radius: 14px; flex-shrink: 0; }
            .school-info { flex: 1; }
            .school-name { font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 800; color: #012030; letter-spacing: 0.5px; text-transform: uppercase; }
            .school-tagline { font-size: 12px; color: #d4af37; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
            .school-contact { font-size: 11px; color: #5a7f92; margin-top: 5px; line-height: 1.6; }
            .ref-block { text-align: right; font-size: 12px; color: #5a7f92; line-height: 1.8; }
            /* Title bar */
            .letter-title { text-align: center; margin-bottom: 28px; }
            .letter-title h2 { font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #012030; background: rgba(33,158,188,0.08); display: inline-block; padding: 8px 28px; border-radius: 4px; border-bottom: 2px solid #293d7d; }
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
            .adm-number { font-size: 20px; font-family: 'Montserrat', sans-serif; font-weight: 800; color: #d4af37; }
            /* Instruction box */
            .instruction-box { background: rgba(41,61,125,0.04); border-left: 4px solid #293d7d; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .instruction-box h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #293d7d; font-weight: 700; margin-bottom: 8px; }
            .instruction-box ol { padding-left: 18px; }
            .instruction-box li { font-size: 13px; line-height: 1.7; margin-bottom: 4px; }
            /* Fee note */
            .fee-note { background: rgba(251,133,0,0.06); border: 1px solid rgba(251,133,0,0.2); border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13px; line-height: 1.6; }
            .fee-note strong { color: #d4af37; }
            /* Signature */
            .signature-block { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sign-left { font-size: 13.5px; line-height: 1.7; }
            .sign-line { width: 200px; border-bottom: 1.5px solid #012030; margin-bottom: 5px; height: 36px; }
            .sign-label { font-size: 11.5px; color: #5a7f92; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
            .stamp-circle { width: 80px; height: 80px; border-radius: 50%; border: 3px double #293d7d; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center; color: #293d7d; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4; }
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
              <img src="${window.location.origin}/logo.png" class="logo" alt="Deeper Life High School Logo" onerror="this.style.display='none'" />
              <div class="school-info">
                <div class="school-name">Deeper Life High School</div>
                <div class="school-tagline">Leadership with Distinction</div>
                <div class="school-contact">
                  Campus: Km 42, Lagos-Ibadan Expressway, Ogun State, Nigeria &nbsp;|&nbsp; Tel: +234 800 354 7466 &nbsp;|&nbsp; ✉ info@deeperlifehighschool.org
                </div>
              </div>
              <div class="ref-block">
                <div><strong>Ref:</strong> ${t.admission_number}</div>
                <div><strong>Date:</strong> ${s}</div>
                <div><strong>Session:</strong> ${g}</div>
              </div>
            </div>

            <!-- TITLE -->
            <div class="letter-title">
              <h2>Letter of Admission</h2>
            </div>

            <!-- SALUTATION -->
            <p class="salutation">
              Dear <strong>${t.parent_first_name} ${t.parent_last_name}</strong> (${t.parent_relationship}),
            </p>

            <!-- OPENING BODY -->
            <p class="body-text">
              On behalf of the Management and Board of Governors of <strong>Deeper Life High School</strong>, it is our distinct pleasure and honour to inform you that, following the successful completion of our Entrance Examination and the thorough review of your application, your ward has been <strong>offered admission</strong> into Deeper Life High School for the <strong>${g} Academic Session</strong>.
            </p>
            <p class="body-text">
              We are confident that your ward possesses the qualities and academic potential that align with Deeper Life High School's standards of excellence. We warmly welcome <strong>${t.child_first_name} ${t.child_last_name}</strong> into our school community.
            </p>

            <!-- CANDIDATE INFO TABLE -->
            <table class="info-table">
              <tr>
                <td>Admission Number</td>
                <td><span class="adm-number">${t.admission_number}</span></td>
              </tr>
              <tr>
                <td>Candidate's Full Name</td>
                <td>${t.child_first_name} ${t.child_last_name}</td>
              </tr>
              <tr>
                <td>Date of Birth</td>
                <td>${t.child_dob}</td>
              </tr>
              <tr>
                <td>Gender</td>
                <td>${t.child_gender}</td>
              </tr>
              <tr>
                <td>Class Admitted Into</td>
                <td>${t.grade_level} — ${g} Session</td>
              </tr>
              <tr>
                <td>Application Number</td>
                <td>${t.application_number}</td>
              </tr>
              <tr>
                <td>Parent / Guardian</td>
                <td>${t.parent_first_name} ${t.parent_last_name} (${t.parent_relationship})</td>
              </tr>
              <tr>
                <td>Parent Contact</td>
                <td>${t.parent_email} &nbsp;|&nbsp; ${t.parent_phone}</td>
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
              ⚠ Please note that this offer of admission <strong>expires 30 days from the date of this letter</strong> if acceptance procedures are not completed. Deeper Life High School reserves the right to offer the position to another candidate.
            </div>

            <!-- CLOSING -->
            <p class="body-text">
              We look forward to welcoming <strong>${t.child_first_name}</strong> to Deeper Life High School and are excited to partner with your family in shaping an extraordinary educational journey. Should you require any clarification, please do not hesitate to contact the Admissions Office.
            </p>
            <p class="body-text">Yours faithfully,</p>

            <!-- SIGNATURE BLOCK -->
            <div class="signature-block">
              <div class="sign-left">
                <div class="sign-line"></div>
                <div style="font-weight: 700; font-size: 14px;">The Principal / Registrar</div>
                <div class="sign-label">Deeper Life High School &nbsp;|&nbsp; Admissions Office</div>
              </div>
              <div class="stamp-circle">DLHS<br/>OFFICIAL<br/>SEAL</div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
              This is an officially generated document by the Deeper Life High School Management System.<br/>
              For verification, contact info@deeperlifehighschool.org or call +234 800 354 7466.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          <\/script>
        </body>
      </html>
    `),n.document.close()},K=t=>{const n=window.open("","_blank");if(!n)return;const s=new Date(t.exam_date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),g=new Date(t.exam_date).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});n.document.write(`
      <html>
        <head>
          <title>Entrance Exam Card - ${t.child_first_name||""} ${t.child_last_name||""}</title>
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <link rel="icon" type="image/png" href="/logo.png">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #16234b; padding: 20px; }
            .card { border: 3px double #293d7d; padding: 30px; max-width: 650px; margin: 0 auto; position: relative; border-radius: 12px; background: #fafdfc; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(33, 158, 188, 0.05); font-weight: 800; pointer-events: none; z-index: 0; white-space: nowrap; }
            .header { display: flex; align-items: center; border-bottom: 2px solid #293d7d; padding-bottom: 15px; margin-bottom: 20px; z-index: 1; position: relative; }
            .logo { width: 60px; height: 60px; border-radius: 12px; margin-right: 15px; }
            .title { flex-grow: 1; }
            .title h1 { margin: 0; font-size: 22px; color: #16234b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .title p { margin: 3px 0 0; font-size: 12px; color: #d4af37; font-weight: 600; text-transform: uppercase; }
            .details { display: grid; grid-template-columns: 140px 1fr; gap: 15px; margin-bottom: 25px; z-index: 1; position: relative; }
            .photo-box { width: 120px; height: 130px; border: 2px dashed #b5c7d3; display: flex; align-items: center; justify-content: center; background: #f0f4f7; font-size: 11px; color: #5a7f92; font-weight: 600; text-align: center; border-radius: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; }
            .info-item { margin-bottom: 6px; }
            .info-label { font-weight: bold; color: #5a7f92; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
            .info-value { font-weight: 600; color: #16234b; }
            .schedule-box { background: rgba(33, 158, 188, 0.08); border: 1.5px solid rgba(33, 158, 188, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px; z-index: 1; position: relative; }
            .schedule-title { font-weight: bold; color: #293d7d; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; letter-spacing: 0.5px; }
            .schedule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; }
            .instructions { font-size: 11.5px; line-height: 1.5; color: #5a7f92; border-top: 1px solid #dde3e8; padding-top: 15px; z-index: 1; position: relative; }
            .instructions ol { padding-left: 20px; margin: 5px 0 0; }
            @media print {
              body { padding: 0; background: #fff; }
              .card { border: 2px solid #293d7d; box-shadow: none; max-width: 100%; margin: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="watermark">DEEPER LIFE HIGH SCHOOL</div>
            <div class="header">
              <img src="/logo.png" class="logo" alt="Logo" />
              <div class="title">
                <h1>Deeper Life High School</h1>
                <p>Entrance Examination Photo Card</p>
              </div>
            </div>
            <div class="details">
              <div class="photo-box">
                ${t.passport_path?`<img src="${j}${t.passport_path}" style="width:120px;height:130px;object-fit:cover;border-radius:8px;" />`:"PASSPORT<br>PHOTOGRAPH"}
              </div>
              <div class="info-grid">
                <div class="info-item" style="grid-column: span 2;">
                  <div class="info-label">Application Number</div>
                  <div class="info-value" style="font-size: 16px; color: #d4af37; font-weight: 700;">${t.application_number||""}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Candidate Name</div>
                  <div class="info-value">${t.child_first_name||""} ${t.child_last_name||""}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Class Applied For</div>
                  <div class="info-value">${t.grade_level||""}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date of Birth</div>
                  <div class="info-value">${t.child_dob||""}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Gender</div>
                  <div class="info-value">${t.child_gender||""}</div>
                </div>
              </div>
            </div>
            
            <div class="schedule-box">
              <div class="schedule-title">Examination Schedule</div>
              <div class="schedule-grid">
                <div class="info-item">
                  <div class="info-label">Exam Type</div>
                  <div class="info-value" style="text-transform: uppercase;">${t.exam_type||"entrance"} Exam</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Seat Number</div>
                  <div class="info-value" style="color: #d4af37; font-weight: 700;">${t.exam_seat_number||"SEAT-100"}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date</div>
                  <div class="info-value">${s}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Time & Venue</div>
                  <div class="info-value">${g} | ${t.exam_venue||"Main Auditorium"}</div>
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
          <\/script>
        </body>
      </html>
    `),n.document.close(),n.focus()},V=t=>{switch(t){case"applied":return e.jsx("span",{style:{color:"#0093dd",background:"rgba(0,147,221,0.12)",padding:"4px 10px",borderRadius:100,fontSize:11.5,fontWeight:700},children:"Applied"});case"exam_scheduled":return e.jsx("span",{style:{color:"#293d7d",background:"rgba(41,61,125,0.12)",padding:"4px 10px",borderRadius:100,fontSize:11.5,fontWeight:700},children:"Exam Scheduled"});case"exam_completed":return e.jsx("span",{style:{color:"#d4af37",background:"rgba(212,175,55,0.14)",padding:"4px 10px",borderRadius:100,fontSize:11.5,fontWeight:700},children:"Exam Graded"});case"admitted":return e.jsx("span",{style:{color:"#293d7d",background:"rgba(41,61,125,0.08)",padding:"4px 10px",borderRadius:100,fontSize:11.5,fontWeight:700},children:"Admitted"});case"rejected":return e.jsx("span",{style:{color:"#dc137b",background:"rgba(220,19,123,0.08)",padding:"4px 10px",borderRadius:100,fontSize:11.5,fontWeight:700},children:"Rejected"});default:return e.jsx("span",{style:{color:"#5a7f92",background:"rgba(90,127,146,0.1)",padding:"4px 10px",borderRadius:100,fontSize:11.5,fontWeight:700},children:t})}},re=a.length,se=a.filter(t=>t.status==="exam_scheduled").length,de=a.filter(t=>t.status==="exam_completed").length,ae=a.filter(t=>t.status==="admitted").length,y=a.filter(t=>{const n=t.child_first_name.toLowerCase().includes(c.toLowerCase())||t.child_last_name.toLowerCase().includes(c.toLowerCase())||t.application_number.toLowerCase().includes(c.toLowerCase())||t.parent_email.toLowerCase().includes(c.toLowerCase()),s=h==="all"?!0:t.status===h;return n&&s});return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:24,padding:"8px 0"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{children:[e.jsx("h1",{style:{fontSize:26,fontWeight:800,margin:0,letterSpacing:"-0.5px"},children:"Admissions Management"}),e.jsx("p",{style:{margin:"4px 0 0",color:"#5a7f92",fontSize:14},children:"Review new applications, schedule examinations, enter grades, and grant student enrollments."})]}),e.jsx("button",{onClick:l,style:{padding:"10px 18px",borderRadius:10,background:"rgba(33, 158, 188, 0.1)",color:"#293d7d",border:"1px solid rgba(41, 61, 125, 0.2)",cursor:"pointer",fontWeight:700,fontSize:13},children:"Refresh Data"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:16},children:[e.jsxs(d,{style:{padding:18,display:"flex",alignItems:"center",gap:14},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:10,background:"rgba(41,61,125,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#293d7d"},children:e.jsx(v,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:20,fontWeight:800},children:re}),e.jsx("div",{style:{fontSize:11.5,color:"#5a7f92",fontWeight:500},children:"Total Applications"})]})]}),e.jsxs(d,{style:{padding:18,display:"flex",alignItems:"center",gap:14},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:10,background:"rgba(0,147,221,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0093dd"},children:e.jsx(ce,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:20,fontWeight:800},children:se}),e.jsx("div",{style:{fontSize:11.5,color:"#5a7f92",fontWeight:500},children:"Exams Scheduled"})]})]}),e.jsxs(d,{style:{padding:18,display:"flex",alignItems:"center",gap:14},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:10,background:"rgba(212,175,55,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#d4af37"},children:e.jsx(ge,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:20,fontWeight:800},children:de}),e.jsx("div",{style:{fontSize:11.5,color:"#5a7f92",fontWeight:500},children:"Exams Graded"})]})]}),e.jsxs(d,{style:{padding:18,display:"flex",alignItems:"center",gap:14},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:10,background:"rgba(41,61,125,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#293d7d"},children:e.jsx(xe,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:20,fontWeight:800},children:ae}),e.jsx("div",{style:{fontSize:11.5,color:"#5a7f92",fontWeight:500},children:"Granted Admissions"})]})]})]}),e.jsx(d,{style:{padding:16},children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr auto auto",gap:14,alignItems:"center"},className:"grid-admissions-filter",children:[e.jsxs("div",{style:{position:"relative"},children:[e.jsx(pe,{size:16,style:{position:"absolute",left:14,top:14,color:"#5a7f92",opacity:.6}}),e.jsx("input",{type:"text",placeholder:"Search by candidate name, application no, or parent email...",value:c,onChange:t=>Z(t.target.value),style:{width:"100%",padding:"11px 12px 11px 38px",borderRadius:10,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx(he,{size:15,style:{opacity:.6}}),e.jsxs("select",{value:h,onChange:t=>ee(t.target.value),style:{padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"},children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"applied",children:"Applied"}),e.jsx("option",{value:"exam_scheduled",children:"Exam Scheduled"}),e.jsx("option",{value:"exam_completed",children:"Exam Graded"}),e.jsx("option",{value:"admitted",children:"Admitted"}),e.jsx("option",{value:"rejected",children:"Rejected"})]})]})]})}),e.jsx(d,{style:{padding:0,overflow:"hidden"},children:Q?e.jsx("div",{style:{padding:40,textAlign:"center",color:"#5a7f92"},children:"Loading admissions..."}):_?e.jsxs("div",{style:{padding:40,textAlign:"center",color:"#dc137b"},children:["⚠ ",_]}):y.length===0?e.jsx("div",{style:{padding:40,textAlign:"center",color:"#5a7f92"},children:"No applications match filters."}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"desktop-only",style:{overflowX:"auto"},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",minWidth:900},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{borderBottom:`2.5px solid ${i==="dark"?"rgba(255,255,255,0.06)":"#dde3e8"}`,textAlign:"left",opacity:.75},children:[e.jsx("th",{style:{padding:"16px 20px",fontSize:12,fontWeight:700,textTransform:"uppercase"},children:"App Number"}),e.jsx("th",{style:{padding:"16px 20px",fontSize:12,fontWeight:700,textTransform:"uppercase"},children:"Candidate Details"}),e.jsx("th",{style:{padding:"16px 20px",fontSize:12,fontWeight:700,textTransform:"uppercase"},children:"Parent Contact"}),e.jsx("th",{style:{padding:"16px 20px",fontSize:12,fontWeight:700,textTransform:"uppercase"},children:"Exam Scores"}),e.jsx("th",{style:{padding:"16px 20px",fontSize:12,fontWeight:700,textTransform:"uppercase"},children:"Status"}),e.jsx("th",{style:{padding:"16px 20px",fontSize:12,fontWeight:700,textTransform:"uppercase",textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:y.map(t=>e.jsxs("tr",{style:{borderBottom:`1px solid ${i==="dark"?"rgba(255,255,255,0.05)":"#dde3e8"}`},children:[e.jsxs("td",{style:{padding:"16px 20px"},children:[e.jsx("div",{style:{fontWeight:700,color:"#293d7d",fontSize:13.5},children:t.application_number}),t.admission_number&&e.jsxs("div",{style:{fontSize:11,color:"#293d7d",fontWeight:700,marginTop:4},children:["Adm No: ",t.admission_number]}),e.jsx("div",{style:{fontSize:11,opacity:.5,marginTop:4},children:new Date(t.created_at).toLocaleDateString()})]}),e.jsx("td",{style:{padding:"16px 20px"},children:e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center"},children:[t.passport_path&&e.jsx("img",{src:j+t.passport_path,alt:"Candidate",style:{width:36,height:42,objectFit:"cover",borderRadius:6,border:"1.5px solid rgba(251,133,0,0.15)"}}),e.jsxs("div",{children:[e.jsxs("div",{style:{fontWeight:700,fontSize:14},children:[t.child_first_name," ",t.child_last_name]}),e.jsxs("div",{style:{fontSize:12,opacity:.7,marginTop:4,display:"flex",gap:8},children:[e.jsxs("span",{children:["Class: ",e.jsx("strong",{children:t.grade_level})]}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:["Gender: ",e.jsx("strong",{children:t.child_gender})]})]})]})]})}),e.jsxs("td",{style:{padding:"16px 20px"},children:[e.jsxs("div",{style:{fontSize:13.5,fontWeight:600},children:[t.parent_first_name," ",t.parent_last_name," (",t.parent_relationship,")"]}),e.jsxs("div",{style:{fontSize:11.5,opacity:.6,marginTop:4,display:"flex",flexDirection:"column",gap:2},children:[e.jsxs("span",{children:["Email: ",t.parent_email]}),e.jsxs("span",{children:["Tel: ",t.parent_phone]})]})]}),e.jsxs("td",{style:{padding:"16px 20px"},children:[t.score_english!==null||t.score_math!==null||t.score_general!==null?e.jsxs("div",{style:{display:"flex",gap:6,fontSize:11.5},children:[e.jsxs("span",{style:{background:"rgba(33,158,188,0.08)",padding:"2px 6px",borderRadius:4},children:["Eng: ",e.jsx("strong",{children:t.score_english})]}),e.jsxs("span",{style:{background:"rgba(251,133,0,0.08)",padding:"2px 6px",borderRadius:4},children:["Math: ",e.jsx("strong",{children:t.score_math})]}),e.jsxs("span",{style:{background:"rgba(42,157,143,0.08)",padding:"2px 6px",borderRadius:4},children:["Gen: ",e.jsx("strong",{children:t.score_general})]})]}):e.jsx("span",{style:{fontSize:12,opacity:.5},children:"Not Graded"}),t.exam_date&&e.jsxs("div",{style:{fontSize:11,opacity:.5,marginTop:6,display:"flex",alignItems:"center",gap:4},children:[e.jsx(fe,{size:10})," ",new Date(t.exam_date).toLocaleDateString()," at ",new Date(t.exam_date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})]})]}),e.jsx("td",{style:{padding:"16px 20px"},children:V(t.status)}),e.jsx("td",{style:{padding:"16px 20px",textAlign:"right"},children:e.jsxs("div",{style:{display:"flex",gap:8,justifyContent:"flex-end"},children:[e.jsx("button",{onClick:()=>M(t),style:{padding:"6px 10px",borderRadius:6,border:"1px solid #293d7d",color:"#293d7d",background:"none",cursor:"pointer",fontSize:11.5,fontWeight:700},children:"Schedule Exam"}),e.jsx("button",{onClick:()=>O(t),style:{padding:"6px 10px",borderRadius:6,border:"1px solid #d4af37",color:"#d4af37",background:"none",cursor:"pointer",fontSize:11.5,fontWeight:700},children:"Grade Exam"}),t.status!=="admitted"&&t.status!=="rejected"&&e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:()=>H(t.id),style:{padding:"6px 10px",borderRadius:6,border:"none",color:"white",background:"#293d7d",cursor:"pointer",fontSize:11.5,fontWeight:700},children:"Approve"}),e.jsx("button",{onClick:()=>q(t.id),style:{padding:"6px 10px",borderRadius:6,border:"none",color:"white",background:"#dc137b",cursor:"pointer",fontSize:11.5,fontWeight:700},children:"Reject"})]}),e.jsx("button",{onClick:()=>K(t),style:{padding:"6px",borderRadius:6,border:`1px solid ${i==="dark"?"rgba(255,255,255,0.12)":"#dde3e8"}`,color:"inherit",background:"none",cursor:"pointer"},title:"Print Exam Card",children:e.jsx(Y,{size:13})}),t.status==="admitted"&&t.admission_number&&e.jsxs("button",{onClick:()=>U(t),style:{padding:"6px 10px",borderRadius:6,border:"1px solid #293d7d",color:"#293d7d",background:"none",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4},title:"Print Admission Letter",children:[e.jsx(v,{size:12})," Letter"]})]})})]},t.id))})]})}),e.jsx("div",{className:"mobile-only",style:{display:"flex",flexDirection:"column",gap:12,padding:14},children:y.map(t=>{var n,s;return e.jsxs("div",{style:{padding:16,borderRadius:12,background:i==="dark"?"rgba(255,255,255,0.03)":"var(--muted)",border:`1px solid ${i==="dark"?"rgba(255,255,255,0.07)":"var(--glass-border)"}`,display:"flex",flexDirection:"column",gap:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10},children:[e.jsxs("div",{style:{display:"flex",gap:10,alignItems:"center"},children:[t.passport_path?e.jsx("img",{src:j+t.passport_path,alt:"Candidate",style:{width:44,height:50,objectFit:"cover",borderRadius:8,border:"1.5px solid rgba(251,133,0,0.2)"}}):e.jsxs("div",{style:{width:44,height:44,borderRadius:"50%",background:"rgba(41,61,125,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#293d7d"},children:[(n=t.child_first_name)==null?void 0:n[0],(s=t.child_last_name)==null?void 0:s[0]]}),e.jsxs("div",{children:[e.jsxs("div",{style:{fontWeight:800,fontSize:14.5,color:"var(--heading)"},children:[t.child_first_name," ",t.child_last_name]}),e.jsxs("div",{style:{fontSize:12,color:"var(--subtext)",marginTop:2},children:["Class: ",e.jsx("strong",{children:t.grade_level})," · ",t.child_gender]}),e.jsxs("div",{style:{fontWeight:700,color:"#293d7d",fontSize:12,marginTop:3},children:["App: ",t.application_number]})]})]}),e.jsx("div",{children:V(t.status)})]}),t.admission_number&&e.jsxs("div",{style:{padding:"6px 10px",borderRadius:6,background:"rgba(42,157,143,0.1)",color:"#293d7d",fontSize:12,fontWeight:700},children:["Admission No: ",t.admission_number]}),e.jsxs("div",{style:{fontSize:12,color:"var(--subtext)",background:"var(--glass-bg)",padding:"8px 12px",borderRadius:8,display:"flex",flexDirection:"column",gap:3},children:[e.jsxs("div",{style:{fontWeight:600,color:"var(--heading)"},children:["Parent: ",t.parent_first_name," ",t.parent_last_name," (",t.parent_relationship,")"]}),e.jsxs("div",{children:["Email: ",t.parent_email]}),e.jsxs("div",{children:["Tel: ",t.parent_phone]})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,background:"var(--glass-bg)",fontSize:12},children:[e.jsx("span",{children:"Exam Scores:"}),t.score_english!==null||t.score_math!==null||t.score_general!==null?e.jsxs("div",{style:{display:"flex",gap:6},children:[e.jsxs("span",{style:{background:"rgba(41,61,125,0.08)",padding:"2px 6px",borderRadius:4,fontWeight:700},children:["Eng: ",t.score_english]}),e.jsxs("span",{style:{background:"rgba(251,133,0,0.1)",padding:"2px 6px",borderRadius:4,fontWeight:700},children:["Math: ",t.score_math]}),e.jsxs("span",{style:{background:"rgba(42,157,143,0.1)",padding:"2px 6px",borderRadius:4,fontWeight:700},children:["Gen: ",t.score_general]})]}):e.jsx("span",{style:{opacity:.6},children:"Not Graded"})]}),e.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:2},children:[e.jsx("button",{onClick:()=>M(t),style:{flex:"1 1 110px",padding:"7px 10px",borderRadius:7,border:"1px solid #293d7d",color:"#293d7d",background:"none",cursor:"pointer",fontSize:11.5,fontWeight:700,textAlign:"center"},children:"Schedule Exam"}),e.jsx("button",{onClick:()=>O(t),style:{flex:"1 1 100px",padding:"7px 10px",borderRadius:7,border:"1px solid #d4af37",color:"#d4af37",background:"none",cursor:"pointer",fontSize:11.5,fontWeight:700,textAlign:"center"},children:"Grade Exam"}),t.status!=="admitted"&&t.status!=="rejected"&&e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:()=>H(t.id),style:{flex:"1 1 80px",padding:"7px 10px",borderRadius:7,border:"none",color:"white",background:"#293d7d",cursor:"pointer",fontSize:11.5,fontWeight:700},children:"Approve"}),e.jsx("button",{onClick:()=>q(t.id),style:{flex:"1 1 80px",padding:"7px 10px",borderRadius:7,border:"none",color:"white",background:"#dc137b",cursor:"pointer",fontSize:11.5,fontWeight:700},children:"Reject"})]}),e.jsxs("button",{onClick:()=>K(t),style:{padding:"7px 12px",borderRadius:7,border:`1px solid ${i==="dark"?"rgba(255,255,255,0.12)":"#dde3e8"}`,color:"inherit",background:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11.5},children:[e.jsx(Y,{size:13})," Card"]}),t.status==="admitted"&&t.admission_number&&e.jsxs("button",{onClick:()=>U(t),style:{padding:"7px 12px",borderRadius:7,border:"1px solid #293d7d",color:"#293d7d",background:"none",cursor:"pointer",fontSize:11.5,fontWeight:700,display:"flex",alignItems:"center",gap:4},children:[e.jsx(v,{size:13})," Letter"]})]})]},t.id)})})]})}),te&&r&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(1, 18, 29, 0.55)",backdropFilter:"blur(6px)"},children:e.jsxs(d,{style:{width:"100%",maxWidth:"420px",background:i==="dark"?"#021625":"white"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18},children:[e.jsx("h3",{style:{fontSize:18,fontWeight:800,margin:0},children:"Grade Entrance Exam"}),e.jsx("button",{onClick:()=>f(!1),style:{background:"none",border:"none",cursor:"pointer",color:"inherit"},children:e.jsx(X,{size:18})})]}),e.jsxs("div",{style:{fontSize:13,color:"#5a7f92",marginBottom:20},children:["Entering scores for ",e.jsxs("strong",{children:[r.child_first_name," ",r.child_last_name]})," (App No: ",r.application_number,")"]}),e.jsxs("form",{onSubmit:ne,style:{display:"flex",flexDirection:"column",gap:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"English Score (0 - 100)"}),e.jsx("input",{type:"number",min:0,max:100,required:!0,value:z,onChange:t=>C(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"Mathematics Score (0 - 100)"}),e.jsx("input",{type:"number",min:0,max:100,required:!0,value:A,onChange:t=>E(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"General Paper Score (0 - 100)"}),e.jsx("input",{type:"number",min:0,max:100,required:!0,value:R,onChange:t=>W(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsx("button",{type:"submit",disabled:T,style:{width:"100%",padding:"12px",border:"none",borderRadius:8,background:"#dc137b",color:"white",fontWeight:700,fontSize:13.5,cursor:"pointer",marginTop:6},children:T?"Saving Grades...":"Save Scores & Mark Completed"})]})]})}),ie&&r&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(1, 18, 29, 0.55)",backdropFilter:"blur(6px)"},children:e.jsxs(d,{style:{width:"100%",maxWidth:"420px",background:i==="dark"?"#021625":"white"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18},children:[e.jsx("h3",{style:{fontSize:18,fontWeight:800,margin:0},children:"Schedule Exam Card"}),e.jsx("button",{onClick:()=>u(!1),style:{background:"none",border:"none",cursor:"pointer",color:"inherit"},children:e.jsx(X,{size:18})})]}),e.jsxs("div",{style:{fontSize:13,color:"#5a7f92",marginBottom:20},children:["Edit schedule for ",e.jsxs("strong",{children:[r.child_first_name," ",r.child_last_name]})," (App No: ",r.application_number,")"]}),e.jsxs("form",{onSubmit:oe,style:{display:"flex",flexDirection:"column",gap:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"Exam Type"}),e.jsxs("select",{value:L,onChange:t=>I(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"},children:[e.jsx("option",{value:"entrance",children:"Entrance Exam"}),e.jsx("option",{value:"supplementary",children:"Supplementary Exam"})]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"Date & Time"}),e.jsx("input",{type:"datetime-local",required:!0,value:m,onChange:t=>b(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"Venue"}),e.jsx("input",{type:"text",required:!0,placeholder:"e.g. Main Auditorium",value:D,onChange:t=>G(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:5},children:"Seat Number"}),e.jsx("input",{type:"text",required:!0,placeholder:"e.g. SEAT-102",value:N,onChange:t=>F(t.target.value),style:{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:13.5,boxSizing:"border-box",background:i==="dark"?"rgba(255,255,255,0.04)":"#fff",border:`1.5px solid ${i==="dark"?"rgba(255,255,255,0.08)":"#dde3e8"}`,color:"inherit",outline:"none"}})]}),e.jsx("button",{type:"submit",disabled:B,style:{width:"100%",padding:"12px",border:"none",borderRadius:8,background:"#293d7d",color:"white",fontWeight:700,fontSize:13.5,cursor:"pointer",marginTop:6},children:B?"Updating Schedule...":"Save Schedule Details"})]})]})})]})}export{ze as default};
