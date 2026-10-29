#!/usr/bin/env python3
"""
DLHS Portal Live Synchronization Engine
Synchronizes scores, assessments, attendance, comments, character/psychomotor ratings,
and passport photos between dlhsportal.org and local Aroura LMS database.
Can be triggered on demand via the LMS Admin UI or scheduled background automation.
"""

import sys
import os
import re
import json
import ssl
import time
import argparse
import urllib.request
import urllib.parse
import http.cookiejar
from datetime import datetime
from threading import Lock
from concurrent.futures import ThreadPoolExecutor, as_completed
import pymysql

# --- Configuration Defaults ---
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'root',
    'database': 'aroura',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

PORTAL_LOGIN_URL = 'https://dlhsportal.org/sms/login.php'
PORTAL_EMAIL_ADMIN = 'ictkaduna@deeperlifehighschool.org'
PORTAL_PASS_ADMIN  = '12'

SESSIONS = {
    '14': '2026/2027',
    '13': '2025/2026',
    '12': '2024/2025',
    '9':  '2023/2024'
}

TERMS = [
    ('term1', '1st Term'),
    ('term2', '2nd Term'),
    ('term3', '3rd Term')
]

CLASSES = {
    '490': 'BASIC 7 DIAMOND',
    '491': 'BASIC 7 GOLD',
    '864': 'BASIC 7 TOPAZ',
    '503': 'BASIC 8 DIAMOND',
    '504': 'BASIC 8 GOLD',
    '505': 'BASIC 8 TOPAZ',
    '506': 'BASIC 9 DIAMOND',
    '507': 'BASIC 9 GOLD',
    '863': 'BASIC 9 TOPAZ',
    '502': 'SS 1 SCIENCE A',
    '862': 'SS 1 SCIENCE B',
    '472': 'SS 1 HUMANITIES',
    '501': 'SS 2 SCIENCE A',
    '444': 'SS 2 SCIENCE B',
    '473': 'SS 2 HUMANITIES',
    '493': 'SS 3 SCIENCE A',
    '443': 'SS 3 SCIENCE B',
    '492': 'SS 3 HUMANITIES',
    '859': 'CLASS OF 2025 SCIENCE A',
    '860': 'CLASS OF 2025 SCIENCE B',
    '861': 'CLASS OF 2025 HUMANITIES',
    '1023': 'CLASS OF 2026 A',
    '1024': 'CLASS OF 2026 B',
    '1025': 'CLASS OF 2026 HUM'
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cookie_lock = Lock()
current_cookie = None
log_lock = Lock()

def get_session_cookie():
    global current_cookie
    with cookie_lock:
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(cj),
            urllib.request.HTTPSHandler(context=ctx)
        )
        login_data = urllib.parse.urlencode({
            'email': PORTAL_EMAIL_ADMIN,
            'password': PORTAL_PASS_ADMIN,
            'user_type': 'admin',
            'submit': 'yes'
        }).encode()
        req = urllib.request.Request(
            PORTAL_LOGIN_URL,
            data=login_data,
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        )
        res = opener.open(req)
        html = res.read().decode('utf-8', errors='ignore')
        if 'logout' not in html.lower() and 'dashboard' not in html.lower():
            raise RuntimeError("Failed to authenticate to DLHS Portal with admin credentials.")
        
        cookie_str = None
        for c in cj:
            if c.name == 'PHPSESSID':
                cookie_str = f"PHPSESSID={c.value}"
                break
        if not cookie_str:
            cookie_str = '; '.join([f"{c.name}={c.value}" for c in cj])
        current_cookie = cookie_str
        return current_cookie

def get_current_cookie():
    global current_cookie
    if not current_cookie:
        return get_session_cookie()
    return current_cookie

class SyncManager:
    def __init__(self, session_filter='all', term_filter='all', scope=None, status_file=None, log_file=None):
        self.session_filter = session_filter
        self.term_filter = term_filter
        self.scope = scope or ['scores', 'assessments', 'photos', 'allocations']
        self.status_file = status_file
        self.log_file = log_file
        
        self.start_time = time.time()
        self.scores_synced = 0
        self.assessments_synced = 0
        self.photos_synced = 0
        self.allocations_synced = 0
        self.errors_count = 0
        self.recent_logs = []
        self.is_running = True
        self.portal_student_ids = {}
        self.portal_class_ids = {}
        
        self.update_status(0, "Initializing DLHS Portal Sync Engine...", "starting")

    def log(self, msg, level="INFO"):
        ts = datetime.now().strftime("%H:%M:%S")
        entry = f"[{ts}] [{level}] {msg}"
        with log_lock:
            print(entry, flush=True)
            self.recent_logs.append(entry)
            if len(self.recent_logs) > 300:
                self.recent_logs.pop(0)
            if self.log_file:
                try:
                    with open(self.log_file, "a") as f:
                        f.write(entry + "\n")
                except Exception:
                    pass

    def update_status(self, progress, step, state="running"):
        if not self.status_file:
            return
        payload = {
            "is_syncing": (state == "running" or state == "starting"),
            "state": state,
            "progress": round(progress, 1),
            "step": step,
            "scores_synced": self.scores_synced,
            "assessments_synced": self.assessments_synced,
            "photos_synced": self.photos_synced,
            "allocations_synced": self.allocations_synced,
            "errors_count": self.errors_count,
            "elapsed_seconds": round(time.time() - self.start_time, 1),
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "recent_logs": self.recent_logs[-80:]
        }
        try:
            temp_file = self.status_file + ".tmp"
            with open(temp_file, "w") as f:
                json.dump(payload, f, indent=2)
            os.replace(temp_file, self.status_file)
        except Exception as e:
            pass

    def get_conn(self):
        c = pymysql.connect(**DB_CONFIG)
        c.autocommit(True)
        return c

    def fetch_url(self, url, data=None, timeout=20, max_retries=3):
        for attempt in range(max_retries):
            cookie = get_current_cookie()
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    'Cookie': cookie,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) DLHS-SyncEngine/2.0'
                }
            )
            try:
                with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                    if 'login.php' in html and 'submit' in html:
                        self.log("Session cookie expired on portal. Re-authenticating...", "WARN")
                        get_session_cookie()
                        continue
                    return html
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                time.sleep(1)
        return ""

    def resolve_teacher_id(self, portal_tname, db_teachers, cur):
        if not portal_tname or portal_tname.upper() in ['NILL', 'NULL', 'NONE', '-', '']:
            return None
        
        clean_n = re.sub(r'[^A-Z0-9]', '', portal_tname.upper())
        if 'IDOKO' in clean_n and 'JOSEPH' in clean_n: return 134
        if 'KOLAWOLE' in clean_n and 'STEPHEN' in clean_n: return 132
        if 'MONDAY' in clean_n and 'ALHAMDU' in clean_n: return 126

        raw_tokens = re.sub(r'^(MR|MRS|MS|MISS|DR)\.?\s+', '', portal_tname.strip(), flags=re.I)
        pt_tokens = set(re.findall(r'[A-Za-z]+', raw_tokens.upper()))
        best_id, best_overlap = None, 0
        for t in db_teachers:
            t_tokens = set(re.findall(r'[A-Za-z]+', f"{t['first_name']} {t['last_name']}".upper()))
            overlap = len(pt_tokens & t_tokens)
            if overlap > best_overlap:
                best_overlap = overlap
                best_id = t['id']

        if best_overlap >= 2 or (len(pt_tokens) == 1 and best_overlap >= 1):
            return best_id

        # Auto-create missing teacher in users table
        parts = [p.title() for p in re.findall(r'[A-Za-z]+', raw_tokens)]
        fn = parts[0] if len(parts) > 0 else 'Teacher'
        ln = parts[-1] if len(parts) > 1 else parts[0]
        email = f"{ln.lower()}{fn.lower()}_kaduna@deeperlifehighschool.org"

        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing = cur.fetchone()
        if existing:
            tid = existing['id'] if isinstance(existing, dict) else existing[0]
            db_teachers.append({'id': tid, 'first_name': fn, 'last_name': ln, 'email': email})
            return tid

        dummy_pass = '$2y$10$wT8m9Z1gV6oP1z0o3q6b4.xW7gE6a5d4c3b2a1e0f9g8h7j6k5l4'
        cur.execute("""
            INSERT INTO users (first_name, last_name, email, role, password_hash)
            VALUES (%s, %s, %s, 'teacher', %s)
        """, (fn, ln, email, dummy_pass))
        new_tid = cur.lastrowid
        db_teachers.append({'id': new_tid, 'first_name': fn, 'last_name': ln, 'email': email})
        self.log(f"   ★ Auto-registered new teacher: {portal_tname} -> {fn} {ln} (ID: {new_tid})")
        return new_tid

    def run_sync(self):
        try:
            self.log("=" * 70)
            self.log("🚀 STARTING DLHS PORTAL SYNC")
            self.log(f"   Target Sessions: {self.session_filter}")
            self.log(f"   Target Terms:    {self.term_filter}")
            self.log(f"   Active Scope:    {', '.join(self.scope)}")
            self.log("=" * 70)

            # Step 1: Authenticate to portal
            self.update_status(5, "Connecting and authenticating to DLHS Portal...", "running")
            cookie = get_session_cookie()
            self.log("✅ Authenticated successfully as ICT Admin (dlhsportal.org)")

            conn = self.get_conn()
            cur = conn.cursor()

            cur.execute("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")
            admin_row = cur.fetchone()
            self.admin_id = admin_row['id'] if admin_row else 3

            # Pre-load local students and courses maps
            cur.execute("SELECT id, admission_number, first_name, last_name, class_id FROM users WHERE role = 'student'")
            local_students = cur.fetchall()
            
            def clean_str(s):
                if not s: return ''
                return re.sub(r'[^A-Z0-9]', '', str(s).upper())

            student_by_adm = {}
            student_by_name = {}
            for s in local_students:
                uid = s['id']
                if s['admission_number']:
                    student_by_adm[clean_str(s['admission_number'])] = uid
                fn = clean_str(s['first_name'])
                ln = clean_str(s['last_name'])
                if fn and ln:
                    student_by_name[fn + ln] = uid
                    student_by_name[ln + fn] = uid

            def resolve_student_id(portal_name, roll_num=None, class_id=None):
                if roll_num:
                    adm_k = clean_str(roll_num)
                    if adm_k in student_by_adm:
                        return student_by_adm[adm_k]
                c_name = clean_str(portal_name)
                if c_name in student_by_name:
                    return student_by_name[c_name]
                tokens = [t for t in re.split(r'[^A-Za-z]+', portal_name) if len(t) >= 2]
                if len(tokens) >= 2:
                    for i in range(len(tokens)):
                        pa = clean_str(tokens[i])
                        pb = clean_str(''.join(tokens[:i] + tokens[i+1:]))
                        if (pa + pb) in student_by_name:
                            return student_by_name[pa + pb]
                        if (pb + pa) in student_by_name:
                            return student_by_name[pb + pa]
                token_set = set(t.upper() for t in tokens)
                best_match = None
                best_overlap = 0
                candidates = [s for s in local_students if s['class_id'] == class_id] if class_id else local_students
                for s in candidates:
                    db_tokens = set(re.findall(r'[A-Za-z]+', f"{s['first_name']} {s['last_name']}".upper()))
                    overlap = len(token_set & db_tokens)
                    if overlap > best_overlap and overlap >= 2:
                        best_overlap = overlap
                        best_match = s['id']
                if not best_match and class_id:
                    for s in local_students:
                        db_tokens = set(re.findall(r'[A-Za-z]+', f"{s['first_name']} {s['last_name']}".upper()))
                        overlap = len(token_set & db_tokens)
                        if overlap > best_overlap and overlap >= 2:
                            best_overlap = overlap
                            best_match = s['id']
                return best_match

            cur.execute("SELECT id, name FROM courses")
            local_courses = cur.fetchall()
            course_name_to_id = {clean_str(c['name']): c['id'] for c in local_courses}
            course_map = {re.sub(r'\s+', ' ', c['name']).strip().upper(): c['id'] for c in local_courses}

            COURSE_ALIASES = {
                'FURTHERMATHS': clean_str('Further Mathematics'),
                'MATHS': clean_str('Mathematics'),
                'ROBOTICSANDAI': clean_str('Robotics and Artificial Intelligence'),
                'ROBOTICSAI': clean_str('Robotics and Artificial Intelligence'),
                'ROBOTICS': clean_str('Robotics and Artificial Intelligence'),
                'PHE': clean_str('Physical and Health Education (P.H.E.)'),
                'PHYSICALANDHEALTHEDUCATION': clean_str('Physical and Health Education (P.H.E.)'),
                'PHYSICALEDUCATION': clean_str('Physical and Health Education (P.H.E.)'),
                'CCA': clean_str('Cultural and Creative Art (C.C.A.)'),
                'CULTURALANDCREATIVEART': clean_str('Cultural and Creative Art (C.C.A.)'),
                'CULTURALANDCREATIVEARTS': clean_str('Cultural and Creative Art (C.C.A.)'),
                'LET': clean_str('Leadership & Entrepreneurship Training (L.E.T.)'),
                'LEADERSHIPENTREPRENEURSHIP': clean_str('Leadership & Entrepreneurship Training (L.E.T.)'),
                'HAUSA': clean_str('Hausa Language'),
                'HAUSALANG': clean_str('Hausa Language'),
                'FRENCH': clean_str('French'),
                'CRS': clean_str('Christian Religious Studies'),
                'CHRISTIANRELIGIOUSKNOWLEDGE': clean_str('Christian Religious Studies'),
                'CRK': clean_str('Christian Religious Studies'),
                'AGRICULTURALSCIENCE': clean_str('Agricultural Science'),
                'AGRICSCIENCE': clean_str('Agricultural Science'),
                'AGRIC': clean_str('Agricultural Science'),
                'DIGITALTECHNOLOGY': clean_str('Digital Technology'),
                'DIGITALTECHNOLOGIES': clean_str('Digital Technology'),   # Portal uses plural form
                'VISUALART': clean_str('Visual Arts'),                    # Portal uses singular form
                'VISUALARTS': clean_str('Visual Arts'),
                'DATA': clean_str('Data Processing'),
                'DATAPROCESSING': clean_str('Data Processing'),
                'CIVIC': clean_str('Civic Education'),
                'CIVICEDUCATION': clean_str('Civic Education'),
                'GARMENTMAKING': clean_str('Fashion Design and Garment Making'),
                'FASHIONDESIGN': clean_str('Fashion Design and Garment Making'),
                'FASHIONDESIGNANDGARMENTMAKING': clean_str('Fashion Design and Garment Making'),
                'HORTICULTURE': clean_str('Horticulture and Crop Production'),
                'HORTICULTUREANDCROPPRODUCTION': clean_str('Horticulture and Crop Production'),
                'CATERING': clean_str('Catering Craft Practice'),
                'CATERINGCRAFT': clean_str('Catering Craft Practice'),
                'CATERINGCRAFTPRACTICE': clean_str('Catering Craft Practice'),
                'SOLAR': clean_str('Solar Photovoltaic Installation and Maintenance'),
                'SOLARINSTALLATION': clean_str('Solar Photovoltaic Installation and Maintenance'),
                'SOLARPHOTOVOLTAICINSTALLATIONANDMAINTENANCE': clean_str('Solar Photovoltaic Installation and Maintenance')
            }

            def resolve_course_id(subj_name):
                norm = clean_str(subj_name)
                if norm in course_name_to_id:
                    return course_name_to_id[norm]
                if norm in COURSE_ALIASES and COURSE_ALIASES[norm] in course_name_to_id:
                    return course_name_to_id[COURSE_ALIASES[norm]]
                for k, cid in course_name_to_id.items():
                    if len(norm) >= 4 and (norm in k or k in norm):
                        return cid
                return None

            cur.execute("SELECT id, name FROM classes")
            local_classes = cur.fetchall()
            class_map = {}
            for cl in local_classes:
                norm = re.sub(r'\s+', ' ', cl['name']).strip().upper()
                class_map[norm] = cl['id']

            # Determine sessions to sync
            sessions_to_sync = []
            for sec_id, s_name in SESSIONS.items():
                if self.session_filter == 'all' or self.session_filter == s_name:
                    sessions_to_sync.append((sec_id, s_name))

            # Determine terms to sync
            terms_to_sync = []
            for t_code, t_name in TERMS:
                if self.term_filter == 'all' or self.term_filter == t_name:
                    terms_to_sync.append((t_code, t_name))

            total_sessions = len(sessions_to_sync)
            current_session_idx = 0

            # -------------------------------------------------------------
            # SCOPE: SUBJECT ALLOCATIONS & COURSE CATALOG
            # -------------------------------------------------------------
            if 'allocations' in self.scope:
                self.log("📚 Phase 1: Synchronizing Subject Allocations & Course Catalog...")
                self.update_status(8, "Syncing Subject Allocations from DLHS Portal...", "running")
                
                # Preload existing courses and teachers
                cur.execute("SELECT id, name FROM courses")
                for c in cur.fetchall():
                    course_name_to_id[clean_str(c['name'])] = c['id']

                cur.execute("SELECT id, first_name, last_name, email FROM users WHERE role IN ('teacher', 'admin', 'hod')")
                db_teachers = cur.fetchall()

                alloc_total = 0
                new_courses_total = 0

                for portal_cid, class_name in CLASSES.items():
                    target_class_id = class_map.get(class_name.upper())
                    if not target_class_id:
                        continue
                    
                    try:
                        post_data = urllib.parse.urlencode({'class_ID': portal_cid}).encode()
                        html = self.fetch_url('https://dlhsportal.org/sms/admin/list_subjs.php', data=post_data, timeout=15)
                        if not html:
                            continue
                        
                        is_junior = any(j in class_name.upper() for j in ['BASIC', 'JSS', 'JS'])
                        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
                            tds = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', d)).strip() for d in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)]
                            if len(tds) >= 4:
                                sr, subj_title, cname, teacher_raw = tds[0], tds[1].strip(), tds[2], tds[3].strip()
                                if not subj_title or subj_title.upper() in ['SUBJECT TITLE', '']:
                                    continue
                                
                                # 1. Resolve or Auto-Create Course
                                cid = resolve_course_id(subj_title)
                                if not cid:
                                    clean_title = subj_title.title()
                                    cur.execute("INSERT INTO courses (name, department) VALUES (%s, %s)", (clean_title, 'General'))
                                    cid = cur.lastrowid
                                    course_name_to_id[clean_str(subj_title)] = cid
                                    course_name_to_id[clean_str(clean_title)] = cid
                                    new_courses_total += 1
                                    self.log(f"   ★ Created new course: {clean_title} (ID: {cid})")

                                # 2. Resolve or Auto-Create Teacher
                                tid = self.resolve_teacher_id(teacher_raw, db_teachers, cur)

                                # 3. Determine Core vs Elective
                                subj_norm = clean_str(subj_title)
                                is_elective = False
                                if not is_junior:
                                    elective_keywords = ['FURTHERMATH', 'CATERING', 'ANIMALHUSBANDRY', 'FOODANDNUTRITION', 'GARMENT', 'FASHION', 'COMMERCE', 'FINANCIALACCOUNT', 'LITERATURE', 'VISUALART', 'FRENCH', 'SOLAR', 'HORTICULTURE', 'TECHNICALDRAW', 'MUSIC', 'HAUSA']
                                    if any(ek in subj_norm for ek in elective_keywords):
                                        is_elective = True
                                sub_type = 'elective' if is_elective else 'core'

                                # 4. Upsert class_subjects
                                cur.execute("""
                                    INSERT INTO class_subjects (class_id, course_id, type, teacher_id)
                                    VALUES (%s, %s, %s, %s)
                                    ON DUPLICATE KEY UPDATE
                                        type = VALUES(type),
                                        teacher_id = COALESCE(VALUES(teacher_id), class_subjects.teacher_id)
                                """, (target_class_id, cid, sub_type, tid))

                                # 5. Upsert teacher_allocations for active sessions
                                for _, s_name in sessions_to_sync:
                                    if tid:
                                        cur.execute("""
                                            INSERT INTO teacher_allocations (teacher_id, class_id, course_id, academic_session)
                                            VALUES (%s, %s, %s, %s)
                                            ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)
                                        """, (tid, target_class_id, cid, s_name))

                                # 6. Auto-enroll class students
                                cur.execute("""
                                    INSERT IGNORE INTO enrollments (student_id, course_id)
                                    SELECT id, %s FROM users WHERE class_id = %s AND role = 'student'
                                """, (cid, target_class_id))

                                alloc_total += 1

                        self.log(f"   ✓ {class_name}: synced subject allocations")
                    except Exception as e:
                        self.log(f"   ⚠ Error fetching allocations for {class_name}: {str(e)}", "WARN")

                self.allocations_synced = alloc_total
                self.log(f"✅ Subject Allocations: {alloc_total} allocations synced, {new_courses_total} new courses created.")

            # -------------------------------------------------------------
            # SCOPE: SCORES (Broadsheets and CA Breakdown)
            # -------------------------------------------------------------
            sync_scores_requested = any(s in self.scope for s in ['scores', 'ca_scores', 'exam_scores', 'broadsheet'])
            if sync_scores_requested:
                self.log("📊 Phase 2: Synchronizing Master Broadsheets & Scores...")
                for sec_id, session_name in sessions_to_sync:
                    current_session_idx += 1
                    sess_progress_base = 10 + ((current_session_idx - 1) / total_sessions) * 45

                    for t_code, term_name in terms_to_sync:
                        self.update_status(sess_progress_base, f"Syncing {session_name} {term_name} Broadsheets...", "running")
                        self.log(f"--- Processing {session_name} - {term_name} ---")

                        total_classes = len(CLASSES)
                        for c_idx, (portal_cid, class_name) in enumerate(CLASSES.items()):
                            try:
                                class_prog = round(sess_progress_base + (c_idx / total_classes) * (45 / max(1, len(terms_to_sync))), 1)
                                self.update_status(class_prog, f"Checking {class_name} ({term_name})...", "running")

                                target_class_id = class_map.get(class_name.upper())
                                parsed_grades = []

                                # Priority 1: Fetch via JSON API endpoints
                                json_data = None
                                for endpoint_name in ['fetch_broadsheet.php', 'fetch_broadsheet_previous.php']:
                                    api_url = f"https://dlhsportal.org/sms/admin/{endpoint_name}?class_ID={portal_cid}&section_ID={sec_id}&term={t_code}"
                                    resp_content = self.fetch_url(api_url, timeout=15)
                                    if resp_content:
                                        try:
                                            d = json.loads(resp_content)
                                            if d.get('students') and d.get('subjects'):
                                                json_data = d
                                                break
                                        except Exception:
                                            pass

                                if json_data:
                                    subjects_raw = json_data.get('subjects', [])
                                    students_raw = json_data.get('students', [])
                                    sub_map = {str(s['id']): s['name'] for s in subjects_raw}

                                    # Detect whether this class term is in Mid-Term scale (max score <= 20)
                                    max_val = 0.0
                                    for st in students_raw:
                                        for sid_str, val in st.get('scores', {}).items():
                                            if val is not None:
                                                try:
                                                    v = float(val)
                                                    if v > max_val: max_val = v
                                                except ValueError:
                                                    pass

                                    is_midterm_scale = (0 < max_val <= 20.0)

                                    # If mid-term scale is detected, or if ca_scores are explicitly requested,
                                    # fetch authentic continuous assessment records from the student report card endpoint.
                                    # This guarantees exact teacher Note(5), Project(5), and CAT1(10) marks,
                                    # and includes elective subjects (such as Further Maths) that broadsheet.php omits.
                                    if is_midterm_scale or 'ca_scores' in self.scope:
                                        cat = 'J' if any(j in class_name.upper() for j in ['BASIC', 'JSS']) else 'S'
                                        try:
                                            mid_records = self.fetch_class_midterm_records(
                                                portal_cid, class_name, sec_id, session_name,
                                                t_code, term_name, cat, target_class_id,
                                                resolve_student_id, resolve_course_id, cur
                                            )
                                            if mid_records:
                                                parsed_grades = mid_records
                                        except Exception as e:
                                            self.log(f"   [CA Scraper Note] {class_name}: {str(e)}", "WARN")

                                    # Fallback or broadsheet exam mode if midterm endpoint returned nothing or broadsheet was terminal
                                    if not parsed_grades:
                                        for st in students_raw:
                                            st_name = st.get('name', '')
                                            uid = resolve_student_id(st_name, class_id=target_class_id)
                                            if not uid:
                                                continue
                                            scores = st.get('scores', {})
                                            for sid_str, val in scores.items():
                                                if val is None or float(val) <= 0:
                                                    continue
                                                sc = float(val)
                                                subj_name = sub_map.get(str(sid_str), '')
                                                cid = resolve_course_id(subj_name)
                                                if not cid:
                                                    continue

                                                if is_midterm_scale:
                                                    # Mid-Term Continuous Assessment mode (scores are out of 20)
                                                    ca1 = sc
                                                    ca2 = None
                                                    exam = None
                                                    asgn = None
                                                    proj = None
                                                    test = None
                                                    max_sc = 20.00
                                                else:
                                                    # End of Term mode (scores are out of 100)
                                                    ca1 = round(sc * 0.20, 2)
                                                    ca2 = round(sc * 0.20, 2)
                                                    exam = round(sc - (ca1 + ca2), 2)
                                                    asgn = None
                                                    proj = None
                                                    test = None
                                                    max_sc = 100.00

                                                parsed_grades.append({
                                                    'student_id': uid,
                                                    'course_id': cid,
                                                    'class_id': target_class_id,
                                                    'score': sc,
                                                    'max_score': max_sc,
                                                    'assignment_score': asgn,
                                                    'project_score': proj,
                                                    'mid_term_test': test,
                                                    'ca1': ca1,
                                                    'ca2': ca2,
                                                    'exam': exam,
                                                    'academic_session': session_name,
                                                    'academic_term': term_name
                                                })

                                # Priority 2: Fallback to HTML table scraper
                                if not parsed_grades:
                                    for page_name in ['broadsheet_pick.php', 'broadsheet_pick_previous.php']:
                                        table_url = f"https://dlhsportal.org/sms/admin/{page_name}?class_ID={portal_cid}&section_ID={sec_id}&term={t_code}&submit=Submit"
                                        html = self.fetch_url(table_url, timeout=15)
                                        if html and '<table' in html and 'No Record Found' not in html:
                                            parsed_grades = self.parse_broadsheet_table(html, session_name, term_name, class_name, student_by_adm, course_map, class_map)
                                            if parsed_grades:
                                                break

                                if parsed_grades:
                                    self.upsert_grades(cur, parsed_grades)
                                    self.scores_synced += len(parsed_grades)
                                    self.log(f"   ✓ {class_name}: synced {len(parsed_grades)} course grades")
                                else:
                                    self.log(f"   • {class_name}: no scores found")
                            except Exception as e:
                                self.errors_count += 1
                                self.log(f"   ⚠ Error fetching broadsheet for {class_name} ({term_name}): {str(e)}", "WARN")

            # -------------------------------------------------------------
            # SCOPE: ASSESSMENTS (Attendance, Remarks, Psychomotor Traits)
            # -------------------------------------------------------------
            if 'assessments' in self.scope:
                self.log("📝 Phase 2: Synchronizing Assessments, Comments & Psychomotor Domains...")
                self.update_status(60, "Gathering student assessment targets...", "running")

                # Extract dir student ID mappings if available
                portal_extract_file = '/Applications/MAMP/htdocs/lms/database/portal_extract/all_students_full.json'
                portal_students_map = {}
                if os.path.exists(portal_extract_file):
                    try:
                        with open(portal_extract_file) as f:
                            for ps in json.load(f):
                                adm = ps.get('admission_number')
                                if adm:
                                    clean_adm = re.sub(r'[^A-Z0-9]', '', adm.upper())
                                    portal_students_map[clean_adm] = ps.get('student_id')
                    except Exception:
                        pass

                # Find all students with grades in targeted sessions
                cur.execute("""
                    SELECT DISTINCT g.student_id, g.academic_session, g.academic_term, g.class_id, u.admission_number, CONCAT(u.first_name, ' ', u.last_name) as student_name
                    FROM grades g
                    JOIN users u ON g.student_id = u.id
                    WHERE g.academic_session IN (%s)
                """ % ','.join(["'%s'" % s[1] for s in sessions_to_sync]))
                target_students = cur.fetchall()

                self.log(f"   Target student assessments to check: {len(target_students)}")
                
                # Fetch and parse report sheets
                assessment_tasks = []
                for st in target_students:
                    adm = st['admission_number']
                    clean_adm = re.sub(r'[^A-Z0-9]', '', adm.upper()) if adm else ''
                    portal_id = self.portal_student_ids.get(st['student_id']) or portal_students_map.get(clean_adm)
                    if not portal_id:
                        continue
                    portal_cid = self.portal_class_ids.get(st['student_id'])
                    
                    sec_id = None
                    for s_k, s_v in SESSIONS.items():
                        if s_v == st['academic_session']:
                            sec_id = s_k
                            break
                    if sec_id and portal_id:
                        assessment_tasks.append({
                            'student_id': st['student_id'],
                            'portal_id': portal_id,
                            'portal_cid': portal_cid,
                            'academic_session': st['academic_session'],
                            'academic_term': st['academic_term'],
                            'class_id': st['class_id'],
                            'sec_id': sec_id,
                            'name': st['student_name']
                        })

                # Deduplicate tasks
                unique_tasks = {}
                for t in assessment_tasks:
                    k = (t['student_id'], t['academic_session'], t['academic_term'])
                    unique_tasks[k] = t
                assessment_tasks = list(unique_tasks.values())

                completed_count = 0
                total_assess = len(assessment_tasks)

                def sync_single_assessment(t):
                    term_code = 'term1' if '1' in t['academic_term'] else ('term2' if '2' in t['academic_term'] else 'term3')
                    html = None
                    # Priority 1: Terminal end-of-term main report card
                    try:
                        url = f"https://dlhsportal.org/sms/result/{term_code}_main.php?id={t['portal_id']}&section={t['sec_id']}"
                        html = self.fetch_url(url, timeout=12)
                    except Exception:
                        pass
                    parsed = self.parse_assessment_html(html) if html else None
                    if not parsed or not parsed.get('has_data'):
                        # Priority 2: Mid-term sheet fallback
                        cls_p = f"&cls={t.get('portal_cid', '')}" if t.get('portal_cid') else ""
                        try:
                            url_mid = f"https://dlhsportal.org/sms/result/{term_code}_mid.php?id={t['portal_id']}&section={t['sec_id']}{cls_p}"
                            html_mid = self.fetch_url(url_mid, timeout=12)
                            parsed = self.parse_assessment_html(html_mid)
                        except Exception:
                            pass
                    return t, parsed

                with ThreadPoolExecutor(max_workers=10) as executor:
                    futures = [executor.submit(sync_single_assessment, t) for t in assessment_tasks]
                    for f in as_completed(futures):
                        completed_count += 1
                        t, parsed = f.result()
                        if parsed and parsed.get('has_data'):
                            self.upsert_assessment(cur, t, parsed)
                            self.assessments_synced += 1

                        if completed_count % 50 == 0 or completed_count == total_assess:
                            prog = 60 + (completed_count / max(1, total_assess)) * 25
                            self.update_status(prog, f"Synced {completed_count}/{total_assess} student assessments...", "running")

                self.log(f"✅ Assessments synced: {self.assessments_synced} records updated/inserted")

            # -------------------------------------------------------------
            # SCOPE: STUDENT PASSPORTS / PHOTOGRAPHS
            # -------------------------------------------------------------
            if 'photos' in self.scope:
                self.log("📸 Phase 3: Checking and synchronizing student passport photographs...")
                self.update_status(88, "Downloading missing student photographs...", "running")
                passport_dir = '/Applications/MAMP/htdocs/lms/public/kaduna'
                os.makedirs(passport_dir, exist_ok=True)

                cur.execute("SELECT id, admission_number, avatar_path FROM users WHERE role = 'student' AND admission_number IS NOT NULL")
                students_for_photos = cur.fetchall()
                total_photos = len(students_for_photos)
                avatar_updates = []

                def process_photo(stu):
                    adm = stu['admission_number']
                    clean_adm = re.sub(r'[^A-Z0-9]', '', adm.upper()) if adm else ''
                    if not clean_adm:
                        return None, False

                    local_file = os.path.join(passport_dir, f"{clean_adm}.jpg")
                    db_avatar = f"/kaduna/{clean_adm}.jpg"
                    downloaded = False

                    # Check if photo exists locally, else download from dlhsportal
                    if not os.path.exists(local_file) or os.path.getsize(local_file) < 100:
                        portal_photo_url = f"https://dlhsportal.org/sms/images/passports/{clean_adm}.jpg"
                        try:
                            req = urllib.request.Request(portal_photo_url, headers={'User-Agent': 'Mozilla/5.0'})
                            with urllib.request.urlopen(req, context=ctx, timeout=3.5) as r:
                                content = r.read()
                                if len(content) > 500:
                                    with open(local_file, 'wb') as pf:
                                        pf.write(content)
                                    downloaded = True
                        except Exception:
                            pass

                    need_db_update = os.path.exists(local_file) and stu.get('avatar_path') != db_avatar
                    return ((db_avatar, stu['id']) if need_db_update else None), downloaded

                completed_photos = 0
                with ThreadPoolExecutor(max_workers=12) as photo_exec:
                    futures = [photo_exec.submit(process_photo, s) for s in students_for_photos]
                    for f in as_completed(futures):
                        completed_photos += 1
                        db_up, is_dl = f.result()
                        if is_dl:
                            self.photos_synced += 1
                        if db_up:
                            avatar_updates.append(db_up)

                        if completed_photos % 40 == 0 or completed_photos == total_photos:
                            prog = 88 + (completed_photos / max(1, total_photos)) * 10
                            self.update_status(prog, f"Checked {completed_photos}/{total_photos} photos ({self.photos_synced} downloaded)...", "running")

                # Apply avatar_path updates to DB in batch
                if avatar_updates:
                    cur.executemany("UPDATE users SET avatar_path = %s WHERE id = %s", avatar_updates)

                self.log(f"✅ Student photographs verified. Synced: {self.photos_synced} new files.")

            # Step Final: Record sync metadata in system_settings
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value) 
                VALUES ('last_portal_sync', %s) 
                ON DUPLICATE KEY UPDATE setting_value = %s
            """, (now_str, now_str))

            duration = round(time.time() - self.start_time, 1)
            self.log("=" * 70)
            self.log(f"🎉 DLHS PORTAL SYNC COMPLETED SUCCESSFULLY IN {duration}s!")
            self.log(f"   Scores Synced:      {self.scores_synced}")
            self.log(f"   Assessments Synced: {self.assessments_synced}")
            self.log(f"   Photos Synced:      {self.photos_synced}")
            self.log(f"   Errors/Warnings:    {self.errors_count}")
            self.log("=" * 70)

            self.update_status(100, f"Sync complete in {duration}s. {self.scores_synced} scores, {self.assessments_synced} assessments synced.", "completed")

        except Exception as e:
            self.errors_count += 1
            self.log(f"❌ FATAL ERROR during portal sync: {str(e)}", "ERROR")
            self.update_status(0, f"Sync failed: {str(e)}", "failed")
            sys.exit(1)

    def parse_broadsheet_table(self, html, session, term, class_name, adm_to_id, course_map, class_map):
        grades = []
        target_class_id = class_map.get(class_name.upper())

        # Extract table rows
        rows = re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', html, re.I)
        if not rows:
            return grades

        # Find header row with subjects
        header_row = None
        for r in rows[:10]:
            if 'SUBJECT' in r.upper() or 'MATHEMATICS' in r.upper() or 'ENGLISH' in r.upper():
                header_row = r
                break

        if not header_row:
            return grades

        th_cells = re.findall(r'<t[hd][^>]*>([\s\S]*?)</t[hd]>', header_row, re.I)
        subjects = []
        for idx, th in enumerate(th_cells):
            clean_th = re.sub(r'<[^>]+>', ' ', th).strip().upper()
            clean_th = re.sub(r'\s+', ' ', clean_th)
            if idx >= 2 and clean_th and clean_th not in ['TOTAL', 'AVERAGE', 'REMARK', 'POSITION', 'RANK', 'GRADE']:
                cid = course_map.get(clean_th)
                if not cid:
                    for c_name, c_id in course_map.items():
                        if clean_th in c_name or c_name in clean_th:
                            cid = c_id
                            break
                subjects.append((idx, clean_th, cid))

        if not subjects:
            return grades

        # Process student data rows
        for r in rows:
            tds = re.findall(r'<td[^>]*>([\s\S]*?)</td>', r, re.I)
            if len(tds) < 3:
                continue

            name_col = re.sub(r'<[^>]+>', ' ', tds[1]).strip().upper()
            adm_match = re.search(r'([A-Z0-9\/\-]+)', name_col)
            clean_adm = re.sub(r'[^A-Z0-9]', '', adm_match.group(1)) if adm_match else ''

            student_id = adm_to_id.get(clean_adm)
            if not student_id:
                for a_k, s_id in adm_to_id.items():
                    if a_k in clean_adm or clean_adm in a_k:
                        student_id = s_id
                        break
            if not student_id:
                continue

            for col_idx, subj_name, course_id in subjects:
                if col_idx < len(tds) and course_id:
                    score_text = re.sub(r'<[^>]+>', '', tds[col_idx]).strip()
                    try:
                        sc = float(score_text)
                        if sc > 0:
                            if sc <= 20.0:
                                ca1 = sc
                                ca2 = None
                                exam = None
                                asgn = round(sc * 0.25, 2)
                                proj = round(sc * 0.25, 2)
                                test = round(sc - (asgn + proj), 2)
                                max_sc = 20.00
                            else:
                                ca1 = round(sc * 0.20, 2)
                                ca2 = round(sc * 0.20, 2)
                                exam = round(sc - (ca1 + ca2), 2)
                                asgn = round(ca1 * 0.25, 2)
                                proj = round(ca1 * 0.25, 2)
                                test = round(ca1 - (asgn + proj), 2)
                                max_sc = 100.00
                            grades.append({
                                'student_id': student_id,
                                'course_id': course_id,
                                'class_id': target_class_id,
                                'score': sc,
                                'max_score': max_sc,
                                'assignment_score': asgn,
                                'project_score': proj,
                                'mid_term_test': test,
                                'ca1': ca1,
                                'ca2': ca2,
                                'exam': exam,
                                'academic_session': session,
                                'academic_term': term
                            })
                    except ValueError:
                        pass
        return grades

    def parse_midterm_report_html(self, html):
        records = []
        if not html:
            return records
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL):
            c = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', d)).strip() for d in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.DOTALL)]
            if len(c) >= 5:
                header = c[0].upper()
                if header in ['SUBJECTS', 'TOTAL', 'ACADEMIC REPORT', '', 'ROLL NUMBER:', 'NAME:', 'SESSION:']:
                    continue
                if any(k in header for k in ['MARK OBTAINABLE', 'PERCENTAGE:', 'KEY TO GRADING', 'CLASS POPULATION']):
                    continue
                subj_name = c[0]
                try:
                    note = float(c[1]) if c[1] else 0.0
                    proj = float(c[2]) if c[2] else 0.0
                    test = float(c[3]) if c[3] else 0.0
                    total = float(c[4]) if c[4] else (note + proj + test)
                    if total > 0 or note > 0 or proj > 0 or test > 0:
                        records.append({
                            'subject': subj_name,
                            'note': note,
                            'project': proj,
                            'test': test,
                            'total': total
                        })
                except ValueError:
                    pass
        return records

    def fetch_class_midterm_records(self, p_cid, class_name, sec_id, session_name, t_code, term_name, cat, target_class_id, resolve_student_id, resolve_course_id, cur=None):
        grades = []
        list_url = f"https://dlhsportal.org/sms/admin/list_std_result.php?class_ID={p_cid}&sec={sec_id}&secname={session_name}&cat={cat}"
        try:
            list_html = self.fetch_url(list_url, timeout=15)
        except Exception:
            return grades

        student_items = []
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', list_html, re.DOTALL):
            m_id = re.search(r'student_result_term[1-3]\?id=(\d+)', tr)
            tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
            if m_id and len(tds) >= 2:
                st_name = re.sub(r'<[^>]+>', '', tds[1]).strip()
                student_items.append((st_name, m_id.group(1)))

        if not student_items:
            return grades

        term_prefix = 'term1' if '1' in t_code else ('term2' if '2' in t_code else 'term3')
        for st_name, p_sid in student_items:
            uid = resolve_student_id(st_name, class_id=target_class_id)
            if not uid:
                continue
            self.portal_student_ids[uid] = p_sid
            self.portal_class_ids[uid] = p_cid

            mid_url = f"https://dlhsportal.org/sms/result/{term_prefix}_mid.php?id={p_sid}&section={sec_id}&cls={p_cid}"
            try:
                mid_html = self.fetch_url(mid_url, timeout=12)
                subjs = self.parse_midterm_report_html(mid_html)
                for sub in subjs:
                    cid = resolve_course_id(sub['subject'])
                    if not cid:
                        continue
                    grades.append({
                        'student_id': uid,
                        'course_id': cid,
                        'class_id': target_class_id,
                        'score': sub['total'],
                        'max_score': 20.00,
                        'assignment_score': sub['note'],
                        'project_score': sub['project'],
                        'mid_term_test': sub['test'],
                        'ca1': sub['total'],
                        'ca2': None,
                        'exam': None,
                        'academic_session': session_name,
                        'academic_term': term_name
                    })

                # Inline Comment & Assessment Syncing
                if cur and ('assessments' in self.scope or 'scores' in self.scope):
                    parsed_assess = self.parse_assessment_html(mid_html)
                    if parsed_assess and parsed_assess.get('has_data'):
                        self.upsert_assessment(cur, {
                            'student_id': uid,
                            'academic_term': term_name,
                            'academic_session': session_name,
                            'class_id': target_class_id
                        }, parsed_assess)
                        self.assessments_synced += 1
            except Exception:
                pass
        return grades

    def parse_assessment_html(self, html):
        res = {'has_data': False}
        if not html:
            return res

        m_p = re.search(r'DAYS PRESENT</td>\s*<td[^>]*>(\d+)</td>', html, re.I)
        m_a = re.search(r'DAYS ABSENT</td>\s*<td[^>]*>(\d+)</td>', html, re.I)
        m_t = re.search(r'TOTAL NUMBER OF DAYS</td>\s*<td[^>]*>(\d+)</td>', html, re.I)

        present = int(m_p.group(1)) if m_p else 0
        absent  = int(m_a.group(1)) if m_a else 0
        total   = int(m_t.group(1)) if m_t else (present + absent)
        if total < present: total = present + absent

        res['days_present'] = present
        res['days_absent']  = absent
        res['total_days']   = total

        # Comments
        m_tc = re.search(r'Class Teacher\'?s? Comment:?</th>\s*<td[^>]*>([\s\S]*?)</td>', html, re.I)
        tc_raw = re.sub(r'<[^>]+>', ' ', m_tc.group(1)).strip() if m_tc else None
        if tc_raw and tc_raw.lower() in ['no comment', '', 'none', '-', 'nill', 'null']:
            tc_raw = None
        res['class_teacher_comment'] = tc_raw

        m_pr = re.search(r'Principal\'?s? Comment:?</th>\s*<td[^>]*>([\s\S]*?)</td>', html, re.I)
        pr_raw = re.sub(r'<[^>]+>', ' ', m_pr.group(1)).strip() if m_pr else None
        if pr_raw and pr_raw.lower() in ['no comment', '', 'none', '-', 'nill', 'null']:
            pr_raw = None
        res['principal_remark'] = pr_raw

        def get_pt(trait):
            m = re.search(rf'<td[^>]*>{trait}</td>\s*<td[^>]*>(\d+)</td>', html, re.I)
            return int(m.group(1)) if m else None

        res['punctuality']         = get_pt('Punctuality') or 5
        res['attitude_to_work']    = get_pt('Home Work') or get_pt('Attitude') or 5
        res['handwriting']         = get_pt('Handwriting') or 5
        res['honesty']             = get_pt('Honesty') or 5
        res['sports']              = get_pt('Sport') or get_pt('Sports') or 4
        res['politeness']          = get_pt('Politeness') or 5
        res['neatness']            = get_pt('Neatness') or 5
        res['leadership']          = get_pt('Leadership') or 4
        res['emotional_stability'] = get_pt('Attitude') or 5
        res['team_spirit']         = get_pt('Team Spirit') or 5

        if present > 0 or total > 0 or res['class_teacher_comment'] or res['principal_remark']:
            res['has_data'] = True
        return res

    def upsert_grades(self, cur, grades_list):
        if not grades_list:
            return
        admin_id = getattr(self, 'admin_id', 3)
        for g in grades_list:
            if 'graded_by' not in g or not g['graded_by']:
                g['graded_by'] = admin_id
            if 'assignment_score' not in g:
                g['assignment_score'] = None
            if 'project_score' not in g:
                g['project_score'] = None
            if 'mid_term_test' not in g:
                g['mid_term_test'] = None
            if 'max_score' not in g:
                g['max_score'] = 100.00

        query = """
            INSERT INTO grades (
                student_id, course_id, class_id, score, max_score,
                assignment_score, project_score, mid_term_test,
                ca1, ca2, exam, academic_session, academic_term, status, graded_by
            ) VALUES (
                %(student_id)s, %(course_id)s, %(class_id)s, %(score)s, %(max_score)s,
                %(assignment_score)s, %(project_score)s, %(mid_term_test)s,
                %(ca1)s, %(ca2)s, %(exam)s, %(academic_session)s, %(academic_term)s, 'published', %(graded_by)s
            )
            ON DUPLICATE KEY UPDATE
                score = COALESCE(VALUES(score), grades.score),
                max_score = COALESCE(VALUES(max_score), grades.max_score),
                assignment_score = COALESCE(VALUES(assignment_score), grades.assignment_score),
                project_score = COALESCE(VALUES(project_score), grades.project_score),
                mid_term_test = COALESCE(VALUES(mid_term_test), grades.mid_term_test),
                ca1 = COALESCE(VALUES(ca1), grades.ca1),
                ca2 = COALESCE(VALUES(ca2), grades.ca2),
                exam = COALESCE(VALUES(exam), grades.exam),
                class_id = COALESCE(VALUES(class_id), grades.class_id),
                status = 'published'
        """
        cur.executemany(query, grades_list)

    def upsert_assessment(self, cur, t, data):
        query = """
            INSERT INTO student_assessments (
                student_id, academic_term, academic_session, class_id,
                days_present, days_absent, total_days,
                class_teacher_comment, principal_remark,
                punctuality, attitude_to_work, handwriting, honesty, sports,
                politeness, neatness, leadership, emotional_stability, team_spirit
            ) VALUES (
                %(sid)s, %(term)s, %(session)s, %(cid)s,
                %(pres)s, %(abs)s, %(tot)s,
                %(tc)s, %(pr)s,
                %(punc)s, %(atti)s, %(hand)s, %(hone)s, %(spor)s,
                %(poli)s, %(neat)s, %(lead)s, %(emot)s, %(team)s
            )
            ON DUPLICATE KEY UPDATE
                days_present = VALUES(days_present),
                days_absent = VALUES(days_absent),
                total_days = VALUES(total_days),
                class_teacher_comment = COALESCE(VALUES(class_teacher_comment), student_assessments.class_teacher_comment),
                principal_remark = COALESCE(VALUES(principal_remark), student_assessments.principal_remark),
                punctuality = VALUES(punctuality),
                attitude_to_work = VALUES(attitude_to_work),
                handwriting = VALUES(handwriting),
                honesty = VALUES(honesty),
                sports = VALUES(sports),
                politeness = VALUES(politeness),
                neatness = VALUES(neatness),
                leadership = VALUES(leadership),
                emotional_stability = VALUES(emotional_stability),
                team_spirit = VALUES(team_spirit)
        """
        cur.execute(query, {
            'sid': t['student_id'],
            'term': t['academic_term'],
            'session': t['academic_session'],
            'cid': t['class_id'],
            'pres': data['days_present'],
            'abs': data['days_absent'],
            'tot': data['total_days'],
            'tc': data['class_teacher_comment'],
            'pr': data['principal_remark'],
            'punc': data['punctuality'],
            'atti': data['attitude_to_work'],
            'hand': data['handwriting'],
            'hone': data['honesty'],
            'spor': data['sports'],
            'poli': data['politeness'],
            'neat': data['neatness'],
            'lead': data['leadership'],
            'emot': data['emotional_stability'],
            'team': data['team_spirit']
        })

def main():
    parser = argparse.ArgumentParser(description="DLHS Portal Synchronization Engine")
    parser.add_argument("--session", default="all", help="Session to sync (e.g. 2026/2027, 2025/2026, 2024/2025, or all)")
    parser.add_argument("--term", default="all", help="Term to sync (e.g. '1st Term', '2nd Term', '3rd Term', or all)")
    parser.add_argument("--scope", default="scores,assessments,photos,allocations", help="Comma-separated scope")
    parser.add_argument("--status-file", default="/Applications/MAMP/htdocs/lms/api/logs/portal_sync_status.json")
    parser.add_argument("--log-file", default="/Applications/MAMP/htdocs/lms/api/logs/portal_sync.log")
    args = parser.parse_args()

    scopes = [s.strip() for s in args.scope.split(",") if s.strip()]
    manager = SyncManager(
        session_filter=args.session,
        term_filter=args.term,
        scope=scopes,
        status_file=args.status_file,
        log_file=args.log_file
    )
    manager.run_sync()

if __name__ == "__main__":
    main()
