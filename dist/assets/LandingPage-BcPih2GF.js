import{c as g,u as y,a as u,r as f,j as e}from"./index-KDddu9cc.js";import{B as x}from"./book-open-Xa9w21Ei.js";import{A as o}from"./arrow-right-ClplX7dS.js";import{X as m}from"./x-BomVtKx6.js";import{M as j}from"./menu-BFwE3cCD.js";import{C as l}from"./chevron-right-BdUYHPzS.js";import{S as d}from"./shield-check-B-k4nzJE.js";import{A as c}from"./award-CqaErtIy.js";import{G as S}from"./graduation-cap-BhfvdAe8.js";import{C as k}from"./circle-check-CAopZtBn.js";import{U as v}from"./users-DAY-dbWc.js";import{P as w}from"./phone-CVAvCNSS.js";import{M as z}from"./mail-Dk3UBqzO.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],C=g("map-pin",N);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]],T=g("scale",W);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"M14 22v-4a2 2 0 1 0-4 0v4",key:"hhkicm"}],["path",{d:"m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10",key:"1xqip1"}],["path",{d:"M18 5v17",key:"1sw6gf"}],["path",{d:"m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6",key:"9d2mlk"}],["path",{d:"M6 5v17",key:"1xfsm0"}],["circle",{cx:"12",cy:"9",r:"2",key:"1092wv"}]],p=g("school",R);function J(){const{theme:i,toggleTheme:b}=y(),a=u(),[n,t]=f.useState(!1),[r,h]=f.useState("junior");return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
        .web-body {
          font-family: 'Lato', 'Plus Jakarta Sans', sans-serif;
          background-color: ${i==="dark"?"#0a1220":"#f8fafc"};
          color: ${i==="dark"?"#f1f5f9":"#1e293b"};
          transition: background-color 0.25s, color 0.25s;
          overflow-x: hidden;
        }

        .web-heading {
          font-family: 'Raleway', sans-serif;
          letter-spacing: -0.02em;
        }

        .glass-nav {
          background: ${i==="dark"?"rgba(10, 18, 32, 0.94)":"rgba(255, 255, 255, 0.95)"};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid ${i==="dark"?"rgba(191, 209, 255, 0.12)":"rgba(41, 61, 125, 0.1)"};
        }

        .hero-banner {
          background-image: linear-gradient(${i==="dark"?"rgba(10,18,32,0.92)":"rgba(248,250,252,0.88)"}, ${i==="dark"?"rgba(10,18,32,0.97)":"rgba(248,250,252,0.96)"}), url(/school_hero.png);
          background-size: cover;
          background-position: center;
        }

        .dlhs-btn-primary {
          background: #dc137b;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(220, 19, 123, 0.28);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dlhs-btn-primary:hover {
          background: #b80f66;
          box-shadow: 0 6px 20px rgba(220, 19, 123, 0.4);
          transform: translateY(-1px);
        }

        .dlhs-btn-secondary {
          background: ${i==="dark"?"rgba(41, 61, 125, 0.25)":"#293d7d"};
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(41, 61, 125, 0.2);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dlhs-btn-secondary:hover {
          background: ${i==="dark"?"rgba(41, 61, 125, 0.4)":"#1e2e60"};
          transform: translateY(-1px);
        }

        .dlhs-btn-outline {
          border: 1.5px solid ${i==="dark"?"rgba(191, 209, 255, 0.25)":"rgba(41, 61, 125, 0.2)"};
          color: ${i==="dark"?"#f1f5f9":"#293d7d"};
          background: ${i==="dark"?"rgba(255, 255, 255, 0.02)":"#ffffff"};
          transition: all 0.2s ease;
        }

        .dlhs-btn-outline:hover {
          border-color: #293d7d;
          background: ${i==="dark"?"rgba(41, 61, 125, 0.2)":"rgba(41, 61, 125, 0.04)"};
          transform: translateY(-1px);
        }

        .dlhs-card {
          background: ${i==="dark"?"#142038":"#ffffff"};
          border: 1px solid ${i==="dark"?"rgba(191, 209, 255, 0.12)":"rgba(41, 61, 125, 0.1)"};
          border-radius: 12px;
          box-shadow: 0 2px 8px -2px rgba(22, 35, 75, 0.04), 0 8px 24px -4px rgba(22, 35, 75, 0.06);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }

        .dlhs-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 14px -2px rgba(22, 35, 75, 0.06), 0 12px 30px -4px rgba(22, 35, 75, 0.1);
          border-color: ${i==="dark"?"rgba(191, 209, 255, 0.2)":"rgba(41, 61, 125, 0.2)"};
        }

        .input-style {
          background: ${i==="dark"?"#101b30":"#ffffff"};
          border: 1.5px solid ${i==="dark"?"rgba(191, 209, 255, 0.15)":"#d8e2ee"};
          color: ${i==="dark"?"#f1f5f9":"#1e293b"};
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-style:focus {
          border-color: #0093dd;
          box-shadow: 0 0 0 3px rgba(0, 147, 221, 0.15);
        }

        .tab-btn-active {
          background: #293d7d;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(41, 61, 125, 0.25);
        }

        .tab-btn-inactive {
          background: ${i==="dark"?"rgba(255, 255, 255, 0.04)":"rgba(41, 61, 125, 0.05)"};
          color: ${i==="dark"?"#94a3b8":"#64748b"};
        }
        .tab-btn-inactive:hover {
          color: ${i==="dark"?"#ffffff":"#293d7d"};
          background: ${i==="dark"?"rgba(255, 255, 255, 0.08)":"rgba(41, 61, 125, 0.09)"};
        }

        /* ===== Mobile Navigation & Drawer ===== */
        .landing-desktop-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .mobile-menu-trigger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          color: inherit;
        }

        .mobile-menu-drawer {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          flex-direction: column;
        }

        .mobile-menu-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(10, 18, 32, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .mobile-menu-content {
          position: relative;
          z-index: 10;
          background: ${i==="dark"?"#101c32":"#ffffff"};
          border-bottom: 2px solid #dc137b;
          padding: 20px 20px 28px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          gap: 18px;
          animation: slideDownMenu 0.25s ease-out;
        }

        @keyframes slideDownMenu {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .mobile-nav-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mobile-nav-item {
          font-size: 15px;
          font-weight: 700;
          font-family: 'Raleway', sans-serif;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          padding: 12px 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.2s;
        }

        .mobile-nav-item:hover {
          background: ${i==="dark"?"rgba(220,19,123,0.12)":"rgba(220,19,123,0.06)"};
          color: #dc137b;
        }

        /* Responsive Layout Overrides */
        @media (max-width: 900px) {
          .landing-desktop-nav {
            display: none !important;
          }
          .mobile-menu-trigger {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .header-portal-btn {
            display: none !important;
          }
          .header-inner {
            padding: 12px 16px !important;
          }
          .hero-banner {
            padding: 50px 16px 40px !important;
            min-height: auto !important;
          }
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .hero-title {
            font-size: clamp(28px, 7vw, 44px) !important;
            letter-spacing: -1px !important;
          }
          .hero-btn-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .hero-btn-row button, .hero-btn-row a {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
          .section-padding {
            padding: 48px 16px !important;
          }
          .grid-about {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .about-img-container {
            height: 240px !important;
          }
          .about-mission-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .academics-tabs {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            justify-content: center !important;
          }
          .academics-tabs button {
            padding: 8px 16px !important;
            font-size: 13px !important;
          }
          .grid-contact {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .contact-form-card {
            padding: 20px 16px !important;
          }
          .contact-form-card .grid-2 {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .contact-form-card button {
            width: 100% !important;
          }
          .footer-padding {
            padding: 40px 16px 20px !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px !important;
          }
        }

        @media (max-width: 550px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}),e.jsxs("div",{className:"web-body min-h-screen",children:[e.jsx("header",{className:"glass-nav sticky top-0 z-50 transition-all",children:e.jsxs("div",{className:"header-inner",style:{maxWidth:1200,margin:"0 auto",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,cursor:"pointer"},onClick:()=>window.scrollTo({top:0,behavior:"smooth"}),children:[e.jsx("img",{src:"/logo.png",alt:"Deeper Life High School",style:{width:44,height:44,borderRadius:10,objectFit:"contain"}}),e.jsxs("div",{children:[e.jsx("span",{className:"web-heading",style:{fontSize:"clamp(16px, 4vw, 20px)",fontWeight:900,color:i==="dark"?"#f8fafc":"#16234b",letterSpacing:"-0.5px",display:"block",lineHeight:1.15},children:"Deeper Life High School"}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#dc137b",letterSpacing:"0.8px",textTransform:"uppercase"},children:"Kaduna Campus Portal"})]})]}),e.jsxs("nav",{className:"landing-desktop-nav",children:[e.jsx("a",{href:"#about",style:{textDecoration:"none",fontSize:14,fontWeight:700,color:"inherit",fontFamily:"'Raleway', sans-serif"},children:"About DLHS"}),e.jsx("a",{href:"#academics",style:{textDecoration:"none",fontSize:14,fontWeight:700,color:"inherit",fontFamily:"'Raleway', sans-serif"},children:"Academic Programmes"}),e.jsx("a",{href:"#contact",style:{textDecoration:"none",fontSize:14,fontWeight:700,color:"inherit",fontFamily:"'Raleway', sans-serif"},children:"Contact"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:[e.jsx("button",{onClick:b,"aria-label":"Toggle Theme",style:{background:"none",border:"none",cursor:"pointer",color:i==="dark"?"#d4af37":"#293d7d",display:"flex",alignItems:"center",padding:6},children:i==="dark"?e.jsx(p,{size:20}):e.jsx(x,{size:20})}),e.jsxs("button",{className:"dlhs-btn-primary header-portal-btn",onClick:()=>a("/login"),style:{padding:"10px 22px",borderRadius:8,border:"none",fontSize:13.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'Raleway', sans-serif"},children:["Portal Login ",e.jsx(o,{size:14})]}),e.jsx("button",{className:"mobile-menu-trigger",onClick:()=>t(!n),"aria-label":"Toggle navigation menu",children:n?e.jsx(m,{size:24}):e.jsx(j,{size:24})})]})]})}),n&&e.jsxs("div",{className:"mobile-menu-drawer",children:[e.jsx("div",{className:"mobile-menu-backdrop",onClick:()=>t(!1)}),e.jsxs("div",{className:"mobile-menu-content",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("img",{src:"/logo.png",alt:"Deeper Life High School",style:{width:36,height:36,borderRadius:8,objectFit:"contain"}}),e.jsx("span",{className:"web-heading",style:{fontSize:17,fontWeight:800},children:"Deeper Life High School"})]}),e.jsx("button",{onClick:()=>t(!1),style:{background:"none",border:"none",cursor:"pointer",color:"inherit",padding:6},children:e.jsx(m,{size:22})})]}),e.jsxs("nav",{className:"mobile-nav-list",children:[e.jsxs("a",{href:"#about",className:"mobile-nav-item",onClick:()=>t(!1),children:["About DLHS ",e.jsx(l,{size:16,style:{opacity:.5}})]}),e.jsxs("a",{href:"#academics",className:"mobile-nav-item",onClick:()=>t(!1),children:["Academic Programmes ",e.jsx(l,{size:16,style:{opacity:.5}})]}),e.jsxs("a",{href:"#contact",className:"mobile-nav-item",onClick:()=>t(!1),children:["Contact Us ",e.jsx(l,{size:16,style:{opacity:.5}})]})]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10,paddingTop:6,borderTop:`1px solid ${i==="dark"?"rgba(255,255,255,0.08)":"rgba(41,61,125,0.1)"}`},children:e.jsxs("button",{className:"dlhs-btn-primary",onClick:()=>{t(!1),a("/login")},style:{width:"100%",padding:"13px",borderRadius:8,border:"none",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"'Raleway', sans-serif"},children:["Access School Portal ",e.jsx(o,{size:16})]})})]})]}),e.jsx("section",{className:"hero-banner",style:{padding:"90px 24px 75px",display:"flex",alignItems:"center"},children:e.jsxs("div",{style:{maxWidth:1200,margin:"0 auto",width:"100%",display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:48,alignItems:"center"},className:"hero-grid",children:[e.jsxs("div",{children:[e.jsxs("div",{style:{display:"inline-flex",alignItems:"center",gap:8,background:i==="dark"?"rgba(220, 19, 123, 0.12)":"rgba(220, 19, 123, 0.08)",border:`1px solid ${i==="dark"?"rgba(220, 19, 123, 0.28)":"rgba(220, 19, 123, 0.2)"}`,padding:"6px 16px",borderRadius:100,marginBottom:20},children:[e.jsx(d,{size:14,style:{color:"#dc137b"}}),e.jsx("span",{style:{fontSize:11.5,fontWeight:800,color:"#dc137b",textTransform:"uppercase",letterSpacing:"1px",fontFamily:"'Raleway', sans-serif"},children:"Motto: Leadership with Distinction"})]}),e.jsxs("h1",{className:"web-heading hero-title",style:{fontSize:"clamp(34px, 5.2vw, 56px)",fontWeight:900,lineHeight:1.12,marginBottom:18,color:i==="dark"?"#f8fafc":"#16234b"},children:["Transforming Minds, Producing ",e.jsx("span",{style:{color:"#dc137b"},children:"Upright Leaders"})]}),e.jsx("p",{className:"hero-subtitle",style:{fontSize:"clamp(15px, 2vw, 17.5px)",lineHeight:1.7,opacity:.9,marginBottom:32,maxWidth:620,color:i==="dark"?"#cbd5e1":"#3a4244"},children:"Welcome to Deeper Life High School (DLHS) — where uncompromising academic excellence meets deep moral and spiritual integrity. Producing graduates who are academically well-grounded and equipped as ethical future leaders."}),e.jsxs("div",{className:"hero-btn-row",style:{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("button",{className:"dlhs-btn-primary",onClick:()=>a("/login"),style:{padding:"15px 32px",borderRadius:8,border:"none",fontSize:15,fontWeight:800,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:10,fontFamily:"'Raleway', sans-serif"},children:["Access School Portal ",e.jsx(o,{size:18})]}),e.jsx("a",{href:"#about",className:"dlhs-btn-outline",style:{padding:"14px 26px",borderRadius:8,textDecoration:"none",fontSize:14.5,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",fontFamily:"'Raleway', sans-serif"},children:"Learn More About DLHS"})]}),e.jsxs("div",{className:"md-hidden",style:{marginTop:28,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10},children:[e.jsxs("div",{className:"dlhs-card",style:{padding:"14px 10px",textAlign:"center"},children:[e.jsx("div",{style:{fontSize:20,fontWeight:900,color:"#293d7d"},className:"web-heading",children:"100%"}),e.jsx("div",{style:{fontSize:11,opacity:.8,fontWeight:600,marginTop:2},children:"WAEC & JAMB Success"})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:"14px 10px",textAlign:"center"},children:[e.jsx("div",{style:{fontSize:20,fontWeight:900,color:"#dc137b"},className:"web-heading",children:"5 Core"}),e.jsx("div",{style:{fontSize:11,opacity:.8,fontWeight:600,marginTop:2},children:"Pillars of Value"})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:"14px 10px",textAlign:"center"},children:[e.jsx("div",{style:{fontSize:20,fontWeight:900,color:"#0093dd"},className:"web-heading",children:"JSS & SSS"}),e.jsx("div",{style:{fontSize:11,opacity:.8,fontWeight:600,marginTop:2},children:"Secondary Only"})]})]})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:16},className:"desktop-only",children:[e.jsxs("div",{className:"dlhs-card",style:{padding:"22px 24px",display:"flex",alignItems:"center",gap:18},children:[e.jsx("div",{style:{width:50,height:50,borderRadius:10,background:"rgba(41, 61, 125, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#293d7d",flexShrink:0},children:e.jsx(c,{size:26})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:22,fontWeight:900,color:i==="dark"?"#f8fafc":"#16234b"},className:"web-heading",children:"National Highflyers"}),e.jsx("div",{style:{fontSize:13,opacity:.8,fontWeight:600,marginTop:2},children:"Consistently Top WAEC & UTME Scores in Nigeria"})]})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:"22px 24px",display:"flex",alignItems:"center",gap:18},children:[e.jsx("div",{style:{width:50,height:50,borderRadius:10,background:"rgba(220, 19, 123, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#dc137b",flexShrink:0},children:e.jsx(d,{size:26})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:22,fontWeight:900,color:i==="dark"?"#f8fafc":"#16234b"},className:"web-heading",children:"5 Core Values"}),e.jsx("div",{style:{fontSize:13,opacity:.8,fontWeight:600,marginTop:2},children:"Holiness, Honesty, Hard work, Discipline, Integrity"})]})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:"22px 24px",display:"flex",alignItems:"center",gap:18},children:[e.jsx("div",{style:{width:50,height:50,borderRadius:10,background:"rgba(0, 147, 221, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0093dd",flexShrink:0},children:e.jsx(p,{size:26})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:22,fontWeight:900,color:i==="dark"?"#f8fafc":"#16234b"},className:"web-heading",children:"Full Boarding Campus"}),e.jsx("div",{style:{fontSize:13,opacity:.8,fontWeight:600,marginTop:2},children:"Structured 24/7 Academic, Moral & Spiritual Mentorship"})]})]})]})]})}),e.jsx("section",{id:"about",className:"section-padding",style:{padding:"85px 24px",maxWidth:1200,margin:"0 auto"},children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:48,alignItems:"center"},className:"grid-about",children:[e.jsxs("div",{className:"about-img-container",style:{borderRadius:14,overflow:"hidden",border:`1.5px solid ${i==="dark"?"rgba(191, 209, 255, 0.15)":"rgba(41, 61, 125, 0.15)"}`,position:"relative",height:450,boxShadow:"0 12px 36px -8px rgba(22, 35, 75, 0.12)"},children:[e.jsx("img",{src:"/school_hero.png",alt:"Deeper Life High School Campus",style:{width:"100%",height:"100%",objectFit:"cover"}}),e.jsxs("div",{style:{position:"absolute",bottom:16,left:16,right:16,background:"rgba(16, 28, 50, 0.94)",backdropFilter:"blur(10px)",borderRadius:10,padding:18,color:"white",border:"1px solid rgba(191, 209, 255, 0.15)"},children:[e.jsx("div",{style:{fontSize:11,fontWeight:800,color:"#d4af37",textTransform:"uppercase",letterSpacing:"1px",marginBottom:3},className:"web-heading",children:"Institutional Legacy"}),e.jsx("h4",{style:{margin:"0 0 4px",fontSize:15,fontWeight:800},className:"web-heading",children:"Leadership with Distinction"}),e.jsx("p",{style:{margin:0,fontSize:12.5,opacity:.85,lineHeight:1.5},children:"Deeper Life High School is a 21st-century Christian mission, full boarding secondary school dedicated to academic distinction and godly character."})]})]}),e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:12.5,fontWeight:800,color:"#dc137b",textTransform:"uppercase",letterSpacing:"1.2px",fontFamily:"'Raleway', sans-serif"},children:"Our Identity"}),e.jsx("h2",{className:"web-heading",style:{fontSize:"clamp(26px, 4vw, 36px)",fontWeight:900,marginTop:8,marginBottom:18,color:i==="dark"?"#f8fafc":"#16234b",lineHeight:1.2},children:"Nurturing Academic Excellence and Godly Character"}),e.jsx("p",{style:{lineHeight:1.75,opacity:.85,marginBottom:24,fontSize:15,color:i==="dark"?"#cbd5e1":"#3a4244"},children:"At Deeper Life High School, we believe that true leadership begins with character. Our holistic secondary school curriculum is designed to stimulate critical inquiry, scientific discovery, and spiritual uprightness, molding students into self-reliant, ethical nation-builders."}),e.jsxs("div",{className:"about-mission-grid",style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:24},children:[e.jsxs("div",{className:"dlhs-card",style:{padding:22,borderLeft:"4px solid #293d7d"},children:[e.jsx("h4",{className:"web-heading",style:{color:"#293d7d",fontSize:16,fontWeight:800,margin:"0 0 8px"},children:"Our Vision"}),e.jsx("p",{style:{fontSize:13,lineHeight:1.65,opacity:.85,margin:0},children:'"To transform our nation by producing upright leaders of the future, through high quality and sound education."'})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:22,borderLeft:"4px solid #dc137b"},children:[e.jsx("h4",{className:"web-heading",style:{color:"#dc137b",fontSize:16,fontWeight:800,margin:"0 0 8px"},children:"Our Mission"}),e.jsx("p",{style:{fontSize:13,lineHeight:1.65,opacity:.85,margin:0},children:'"To produce students who are academically well-grounded, morally upright and adequately equipped as future leaders."'})]})]}),e.jsxs("div",{style:{marginTop:28,borderTop:`1px solid ${i==="dark"?"rgba(191,209,255,0.12)":"rgba(41,61,125,0.1)"}`,paddingTop:20},children:[e.jsx("h4",{className:"web-heading",style:{color:i==="dark"?"#d4af37":"#16234b",fontSize:13.5,fontWeight:800,margin:"0 0 14px",textTransform:"uppercase",letterSpacing:"1px"},children:"The 5 Core Values"}),e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:10},children:[{label:"Holiness",icon:e.jsx(S,{size:14,style:{color:"#dc137b"}})},{label:"Honesty",icon:e.jsx(k,{size:14,style:{color:"#0093dd"}})},{label:"Hard work",icon:e.jsx(c,{size:14,style:{color:"#d4af37"}})},{label:"Discipline",icon:e.jsx(T,{size:14,style:{color:"#293d7d"}})},{label:"Integrity",icon:e.jsx(d,{size:14,style:{color:"#0093dd"}})}].map(s=>e.jsxs("span",{style:{padding:"8px 18px",borderRadius:8,background:i==="dark"?"rgba(255, 255, 255, 0.04)":"#ffffff",border:`1.5px solid ${i==="dark"?"rgba(191, 209, 255, 0.15)":"rgba(41, 61, 125, 0.14)"}`,color:i==="dark"?"#f1f5f9":"#16234b",fontSize:13,fontWeight:700,fontFamily:"'Raleway', sans-serif",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 1px 3px rgba(0,0,0,0.03)"},children:[s.icon,e.jsx("span",{children:s.label})]},s.label))})]})]})]})}),e.jsx("section",{id:"academics",className:"section-padding",style:{padding:"85px 24px",background:i==="dark"?"#0c1527":"#f1f5f9"},children:e.jsxs("div",{style:{maxWidth:1200,margin:"0 auto"},children:[e.jsxs("div",{style:{textAlign:"center",marginBottom:40},children:[e.jsx("span",{style:{fontSize:12.5,fontWeight:800,color:"#dc137b",textTransform:"uppercase",letterSpacing:"1.2px",fontFamily:"'Raleway', sans-serif"},children:"Academic Programmes"}),e.jsx("h2",{className:"web-heading",style:{fontSize:"clamp(26px, 4vw, 36px)",fontWeight:900,marginTop:8,marginBottom:12,color:i==="dark"?"#f8fafc":"#16234b"},children:"Pure Secondary School Curricula"}),e.jsx("p",{style:{opacity:.85,maxWidth:650,margin:"0 auto",fontSize:15,color:i==="dark"?"#cbd5e1":"#3a4244",lineHeight:1.7},children:"Deeper Life High School strictly operates a pure secondary school model (JSS 1 through SSS 3), integrating the Nigerian National Curriculum with modern global standards in science, languages, and technical mastery."})]}),e.jsxs("div",{className:"academics-tabs",style:{display:"flex",justifyContent:"center",gap:12,marginBottom:36},children:[e.jsx("button",{className:r==="junior"?"tab-btn-active":"tab-btn-inactive",onClick:()=>h("junior"),style:{padding:"12px 28px",borderRadius:8,border:"none",fontSize:14,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"'Raleway', sans-serif"},children:"Junior Secondary (JSS 1–3)"}),e.jsx("button",{className:r==="senior"?"tab-btn-active":"tab-btn-inactive",onClick:()=>h("senior"),style:{padding:"12px 28px",borderRadius:8,border:"none",fontSize:14,fontWeight:800,cursor:"pointer",transition:"all 0.2s",fontFamily:"'Raleway', sans-serif"},children:"Senior Secondary (SSS 1–3)"})]}),e.jsxs("div",{className:"academics-cards-grid",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))",gap:24},children:[r==="junior"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"dlhs-card",style:{padding:"30px 26px"},children:[e.jsx("div",{style:{width:46,height:46,borderRadius:10,background:"rgba(41, 61, 125, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#293d7d",marginBottom:18},children:e.jsx(p,{size:24})}),e.jsx("h3",{className:"web-heading",style:{fontSize:19,fontWeight:800,margin:"0 0 10px",color:i==="dark"?"#f8fafc":"#16234b"},children:"Basic Science & General Studies (JSS 1–3)"}),e.jsx("p",{style:{fontSize:14,opacity:.85,lineHeight:1.7,margin:"0 0 20px",color:i==="dark"?"#cbd5e1":"#3a4244"},children:"Comprehensive grounding in core sciences, foundational mathematics, pre-vocational studies, computer science, and languages, preparing students for exemplary performance in the National Basic Education Certificate Examination (BECE)."}),e.jsx("div",{style:{borderTop:`1px solid ${i==="dark"?"rgba(191,209,255,0.1)":"#e2e8f0"}`,paddingTop:16,fontSize:12.5,fontWeight:600,color:i==="dark"?"#94a3b8":"#64748b"},children:"Curriculum: Mathematics · Basic Science & Technology · English Studies · French · Agricultural Science · Business Studies"})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:"30px 26px"},children:[e.jsx("div",{style:{width:46,height:46,borderRadius:10,background:"rgba(0, 147, 221, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0093dd",marginBottom:18},children:e.jsx(v,{size:24})}),e.jsx("h3",{className:"web-heading",style:{fontSize:19,fontWeight:800,margin:"0 0 10px",color:i==="dark"?"#f8fafc":"#16234b"},children:"Digital Literacy & STEM Discovery"}),e.jsx("p",{style:{fontSize:14,opacity:.85,lineHeight:1.7,margin:"0 0 20px",color:i==="dark"?"#cbd5e1":"#3a4244"},children:"Cultivating analytical mindsets and practical ingenuity through hands-on science laboratories, introductory coding, computer-based testing (CBT) mastery, and robotics workshops designed to stimulate early innovation."}),e.jsx("div",{style:{borderTop:`1px solid ${i==="dark"?"rgba(191,209,255,0.1)":"#e2e8f0"}`,paddingTop:16,fontSize:12.5,fontWeight:600,color:i==="dark"?"#94a3b8":"#64748b"},children:"Modules: Algorithm Design · Science Practical Exhibitions · CBT Diagnostics · Logical Reasoning"})]})]}),r==="senior"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"dlhs-card",style:{padding:"30px 26px"},children:[e.jsx("div",{style:{width:46,height:46,borderRadius:10,background:"rgba(220, 19, 123, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#dc137b",marginBottom:18},children:e.jsx(c,{size:24})}),e.jsx("h3",{className:"web-heading",style:{fontSize:19,fontWeight:800,margin:"0 0 10px",color:i==="dark"?"#f8fafc":"#16234b"},children:"Science & Technology Faculty (SSS 1–3)"}),e.jsx("p",{style:{fontSize:14,opacity:.85,lineHeight:1.7,margin:"0 0 20px",color:i==="dark"?"#cbd5e1":"#3a4244"},children:"Rigorous and intensive instruction in Physics, Chemistry, Biology, Further Mathematics, and Technical Drawing. DLHS candidates consistently record the highest aggregate scores nationwide in WAEC, NECO, and UTME."}),e.jsx("div",{style:{borderTop:`1px solid ${i==="dark"?"rgba(191,209,255,0.1)":"#e2e8f0"}`,paddingTop:16,fontSize:12.5,fontWeight:600,color:i==="dark"?"#94a3b8":"#64748b"},children:"Specializations: Physics · Chemistry · Biology · Further Mathematics · Agricultural Science"})]}),e.jsxs("div",{className:"dlhs-card",style:{padding:"30px 26px"},children:[e.jsx("div",{style:{width:46,height:46,borderRadius:10,background:"rgba(41, 61, 125, 0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#293d7d",marginBottom:18},children:e.jsx(x,{size:24})}),e.jsx("h3",{className:"web-heading",style:{fontSize:19,fontWeight:800,margin:"0 0 10px",color:i==="dark"?"#f8fafc":"#16234b"},children:"Arts, Humanities & Commercial Sciences"}),e.jsx("p",{style:{fontSize:14,opacity:.85,lineHeight:1.7,margin:"0 0 20px",color:i==="dark"?"#cbd5e1":"#3a4244"},children:"Instilling critical discourse, economic acumen, and ethical leadership through Financial Accounting, Government, Economics, Literature-in-English, and Christian Religious Studies, preparing scholars for legal, corporate, and public service careers."}),e.jsx("div",{style:{borderTop:`1px solid ${i==="dark"?"rgba(191,209,255,0.1)":"#e2e8f0"}`,paddingTop:16,fontSize:12.5,fontWeight:600,color:i==="dark"?"#94a3b8":"#64748b"},children:"Specializations: Literature in English · Economics · Financial Accounting · Commerce · Government"})]})]})]})]})}),e.jsx("section",{id:"contact",className:"section-padding",style:{padding:"85px 24px",maxWidth:1200,margin:"0 auto"},children:e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"0.8fr 1.2fr",gap:48},className:"grid-contact",children:[e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:12.5,fontWeight:800,color:"#dc137b",textTransform:"uppercase",letterSpacing:"1.2px",fontFamily:"'Raleway', sans-serif"},children:"Official Channels"}),e.jsx("h2",{className:"web-heading",style:{fontSize:"clamp(26px, 4vw, 36px)",fontWeight:900,marginTop:8,marginBottom:18,color:i==="dark"?"#f8fafc":"#16234b"},children:"Campus Inquiries & Admissions"}),e.jsx("p",{style:{opacity:.85,lineHeight:1.7,marginBottom:28,fontSize:15,color:i==="dark"?"#cbd5e1":"#3a4244"},children:"For inquiries regarding student results, admission verification, transcripts, or academic scheduling, please contact the campus registry below."}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:18},children:[e.jsxs("div",{style:{display:"flex",gap:14,alignItems:"center"},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:8,background:"rgba(41, 61, 125, 0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#293d7d",flexShrink:0},children:e.jsx(w,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11.5,opacity:.7,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"},children:"Admissions & Registry"}),e.jsx("div",{style:{fontSize:14.5,fontWeight:800,color:i==="dark"?"#f8fafc":"#16234b"},children:"+234 (0) 800 354 7466"})]})]}),e.jsxs("div",{style:{display:"flex",gap:14,alignItems:"center"},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:8,background:"rgba(220, 19, 123, 0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#dc137b",flexShrink:0},children:e.jsx(z,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11.5,opacity:.7,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"},children:"Official Campus Registry"}),e.jsx("div",{style:{fontSize:14.5,fontWeight:800,color:i==="dark"?"#f8fafc":"#16234b"},children:"info@deeperlifehighschool.org"})]})]}),e.jsxs("div",{style:{display:"flex",gap:14,alignItems:"center"},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:8,background:"rgba(0, 147, 221, 0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0093dd",flexShrink:0},children:e.jsx(C,{size:20})}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11.5,opacity:.7,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"},children:"Institutional Identity"}),e.jsx("div",{style:{fontSize:14.5,fontWeight:800,color:i==="dark"?"#f8fafc":"#16234b"},children:"Deeper Life High School (DLHS)"})]})]})]})]}),e.jsxs("div",{className:"dlhs-card contact-form-card",style:{padding:32},children:[e.jsx("h3",{className:"web-heading",style:{fontSize:20,fontWeight:800,margin:"0 0 16px",color:i==="dark"?"#f8fafc":"#16234b"},children:"Send an Inquiry to Registry"}),e.jsxs("form",{style:{display:"flex",flexDirection:"column",gap:16},children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16},className:"grid-2",children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:6,color:i==="dark"?"#cbd5e1":"#16234b"},children:"Full Name"}),e.jsx("input",{type:"text",placeholder:"e.g. Dr. Samuel Adeyemi",className:"input-style",style:{width:"100%",padding:"11px 14px",borderRadius:6,fontSize:13.5,boxSizing:"border-box"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:6,color:i==="dark"?"#cbd5e1":"#16234b"},children:"Email Address"}),e.jsx("input",{type:"email",placeholder:"name@domain.com",className:"input-style",style:{width:"100%",padding:"11px 14px",borderRadius:6,fontSize:13.5,boxSizing:"border-box"}})]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:6,color:i==="dark"?"#cbd5e1":"#16234b"},children:"Inquiry Category"}),e.jsx("input",{type:"text",placeholder:"e.g. Result Verification / Admissions Query",className:"input-style",style:{width:"100%",padding:"11px 14px",borderRadius:6,fontSize:13.5,boxSizing:"border-box"}})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:12,fontWeight:700,marginBottom:6,color:i==="dark"?"#cbd5e1":"#16234b"},children:"Message Description"}),e.jsx("textarea",{rows:4,placeholder:"State details of your inquiry clearly...",className:"input-style",style:{width:"100%",padding:"11px 14px",borderRadius:6,fontSize:13.5,boxSizing:"border-box",fontFamily:"inherit"}})]}),e.jsx("button",{type:"button",onClick:()=>alert("Thank you. Your message has been received by the DLHS Registry."),className:"dlhs-btn-primary",style:{padding:"13px 28px",border:"none",borderRadius:6,fontWeight:800,fontSize:14,cursor:"pointer",alignSelf:"flex-start",fontFamily:"'Raleway', sans-serif"},children:"Submit Inquiry"})]})]})]})}),e.jsxs("footer",{className:"footer-padding",style:{background:"#10192e",color:"#f8fafc",padding:"64px 24px 24px"},children:[e.jsxs("div",{style:{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"1.2fr 0.8fr 0.8fr 1.2fr",gap:36,marginBottom:40},className:"footer-grid",children:[e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,marginBottom:16},children:[e.jsx("img",{src:"/logo.png",alt:"Deeper Life High School",style:{width:40,height:40,borderRadius:8,objectFit:"contain"}}),e.jsxs("div",{children:[e.jsx("span",{className:"web-heading",style:{fontSize:18,fontWeight:900,display:"block",color:"#ffffff"},children:"Deeper Life High School"}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:"#d4af37",textTransform:"uppercase",letterSpacing:"1px"},children:"Leadership with Distinction"})]})]}),e.jsx("p",{style:{fontSize:13,opacity:.75,lineHeight:1.7,maxWidth:360},children:"A 21st-century Christian mission, full boarding secondary school committed to uncompromising academic excellence and godly character."})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"web-heading",style:{fontSize:14,fontWeight:800,marginBottom:16,color:"#d4af37",textTransform:"uppercase",letterSpacing:"1px"},children:"Institution"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:11,fontSize:13.5},children:[e.jsx("a",{href:"#about",style:{color:"inherit",opacity:.8,textDecoration:"none"},children:"About DLHS"}),e.jsx("a",{href:"#academics",style:{color:"inherit",opacity:.8,textDecoration:"none"},children:"Academic Programmes"}),e.jsx("a",{href:"#contact",style:{color:"inherit",opacity:.8,textDecoration:"none"},children:"Contact Registry"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"web-heading",style:{fontSize:14,fontWeight:800,marginBottom:16,color:"#d4af37",textTransform:"uppercase",letterSpacing:"1px"},children:"Portal Portals"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:11,fontSize:13.5},children:[e.jsx("span",{onClick:()=>a("/login"),style:{opacity:.8,cursor:"pointer"},children:"Student Portal"}),e.jsx("span",{onClick:()=>a("/login"),style:{opacity:.8,cursor:"pointer"},children:"Teacher Portal"}),e.jsx("span",{onClick:()=>a("/login"),style:{opacity:.8,cursor:"pointer"},children:"Administrator Portal"}),e.jsx("span",{onClick:()=>a("/parent/admissions-login"),style:{opacity:.8,cursor:"pointer"},children:"Parent Admissions"})]})]}),e.jsxs("div",{children:[e.jsx("h4",{className:"web-heading",style:{fontSize:14,fontWeight:800,marginBottom:16,color:"#d4af37",textTransform:"uppercase",letterSpacing:"1px"},children:"Secure Access"}),e.jsx("p",{style:{fontSize:12.5,opacity:.75,marginBottom:16,lineHeight:1.6},children:"Authorized students, parents, teachers, and school administrators can authenticate to access academic records."}),e.jsx("button",{onClick:()=>a("/login"),className:"dlhs-btn-primary",style:{width:"100%",padding:"13px",border:"none",borderRadius:6,fontSize:13.5,fontWeight:800,cursor:"pointer",fontFamily:"'Raleway', sans-serif"},children:"Access School Portal →"})]})]}),e.jsxs("div",{style:{borderTop:"1px solid rgba(191,209,255,0.12)",paddingTop:20,textAlign:"center",fontSize:12,opacity:.65},children:["© ",new Date().getFullYear()," Deeper Life High School (DLHS). All Rights Reserved. Powered by JLM."]})]})]})]})}export{J as default};
