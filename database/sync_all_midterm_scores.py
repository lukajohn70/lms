#!/usr/bin/env python3
"""
Synchronizes all authentic Mid-Term Continuous Assessment scores (Note, Project, CAT1)
from dlhsportal.org for ALL classes in 2026/2027 1st Term.
"""
import urllib.request
import urllib.parse
import http.cookiejar
import ssl
import re
import time
import pymysql

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

PORTAL_EMAIL_ADMIN = 'ictkaduna@deeperlifehighschool.org'
PORTAL_PASS_ADMIN  = '12'

CLASSES = [
    ('501', 'SS 2 SCIENCE A', 'S'),
    ('444', 'SS 2 SCIENCE B', 'S'),
    ('473', 'SS 2 HUMANITIES', 'S'),
    ('493', 'SS 3 SCIENCE A', 'S'),
    ('443', 'SS 3 SCIENCE B', 'S'),
    ('492', 'SS 3 HUMANITIES', 'S')
]

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

login_data = urllib.parse.urlencode({
    'email': PORTAL_EMAIL_ADMIN,
    'password': PORTAL_PASS_ADMIN,
    'user_type': 'admin',
    'submit': 'yes'
}).encode()
opener.open(urllib.request.Request('https://dlhsportal.org/sms/login.php', data=login_data, headers={'User-Agent': 'Mozilla/5.0'}))

conn = pymysql.connect(
    host='127.0.0.1', user='root', password='root', database='aroura',
    charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor
)
cur = conn.cursor()

# Preload DB course and class maps
cur.execute('SELECT id, name FROM courses')
courses = cur.fetchall()
course_cache = {}

COURSE_ALIASES = {
    'HAUSA': 'Hausa Language',
    'HAUSALANG': 'Hausa Language',
    'FURTHERMATHS': 'Further Mathematics',
    'ROBOTICSANDA.I.': 'Robotics',
    'ROBOTICSANDAI': 'Robotics',
    'LET': 'Leadership Entrepreneurship Training (L.E.T.)',
    'CCA': 'Cultural and Creative Art (C.C.A.)',
    'CULTURALANDCREATIVEARTS': 'Cultural and Creative Art (C.C.A.)',
    'PHE': 'Physical and Health Education (P.H.E.)',
    'PHYSICALANDHEALTHEDUCATION': 'Physical and Health Education (P.H.E.)',
    'CRS': 'Christian Religious Studies',
    'CHRISTIANRELIGIOUSSTUDIES': 'Christian Religious Studies',
    'AGRICULTURALSCIENCE': 'Agricultural Science',
    'AGRICSCIENCE': 'Agricultural Science',
    'FRENCH': 'French',
    'DIGITALTECHNOLOGY': 'Digital Technology',
    'HORTICULTUREANDCROPPRODUCTION': 'Horticulture and Crop Production',
    'FASHIONDESIGNANDGARMENTMAKING': 'Fashion Design and Garment Making',
    'CATERINGCRAFTPRACTICE': 'Catering Craft Practice',
    'SOLARPHOTOVOLTAICINSTALLATIONANDMAINTENANCE': 'Solar Photovoltaic Installation and Maintenance'
}

def resolve_course_id(name):
    clean = re.sub(r'[^A-Z0-9]', '', name.upper())
    if clean in course_cache:
        return course_cache[clean]
    if clean in COURSE_ALIASES:
        target_name = COURSE_ALIASES[clean]
        for c in courses:
            if c['name'].upper() == target_name.upper():
                course_cache[clean] = c['id']
                return c['id']
    for c in courses:
        cnorm = re.sub(r'[^A-Z0-9]', '', c['name'].upper())
        if clean == cnorm or (len(clean) >= 4 and clean in cnorm) or (len(cnorm) >= 4 and cnorm in clean):
            course_cache[clean] = c['id']
            return c['id']
    return None

cur.execute('SELECT id, name FROM classes')
classes_db = {c['name'].upper(): c['id'] for c in cur.fetchall()}

cur.execute('SELECT id, first_name, last_name, admission_number, class_id FROM users WHERE role = "student"')
all_students = cur.fetchall()

def resolve_student_id(pname, class_id=None):
    p_tokens = set(re.findall(r'[A-Za-z]+', pname.upper()))
    best_id = None
    best_overlap = 0
    candidates = [s for s in all_students if s['class_id'] == class_id] if class_id else all_students
    for s in candidates:
        s_tokens = set(re.findall(r'[A-Za-z]+', f"{s['first_name']} {s['last_name']}".upper()))
        overlap = len(p_tokens & s_tokens)
        if overlap > best_overlap and overlap >= 2:
            best_overlap = overlap
            best_id = s['id']
    if not best_id and class_id:
        for s in all_students:
            s_tokens = set(re.findall(r'[A-Za-z]+', f"{s['first_name']} {s['last_name']}".upper()))
            overlap = len(p_tokens & s_tokens)
            if overlap > best_overlap and overlap >= 2:
                best_overlap = overlap
                best_id = s['id']
    return best_id

def parse_midterm_html(html):
    records = []
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

print("=" * 70)
print("🚀 STARTING FULL MID-TERM BREAKDOWN IMPORT (ALL 18 CLASSES)")
print("=" * 70)

def fetch_with_retry(url, timeout=15, max_retries=3):
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with opener.open(req, timeout=timeout) as resp:
                return resp.read().decode('utf-8', errors='ignore')
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(2)
    return ""

total_grades_upserted = 0
total_students_processed = 0

start_time = time.time()

for p_cid, c_name, cat in CLASSES:
    class_id = classes_db.get(c_name.upper())
    class_t0 = time.time()
    
    # Fetch students in this class from portal with retry
    list_url = f"https://dlhsportal.org/sms/admin/list_std_result.php?class_ID={p_cid}&sec={14}&secname=2026/2027&cat={cat}"
    try:
        list_html = fetch_with_retry(list_url, timeout=15, max_retries=3)
    except Exception as e:
        print(f"[{c_name}] Failed to load student list: {e}")
        continue

    # Extract student items
    student_items = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', list_html, re.DOTALL):
        m_id = re.search(r'student_result_term1\?id=(\d+)', tr)
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        if m_id and len(tds) >= 2:
            st_name = re.sub(r'<[^>]+>', '', tds[1]).strip()
            student_items.append((st_name, m_id.group(1)))

    if not student_items:
        print(f"[{c_name}] No students found on portal.")
        continue

    class_grades_count = 0
    for st_name, p_sid in student_items:
        uid = resolve_student_id(st_name, class_id)
        if not uid:
            continue

        mid_url = f"https://dlhsportal.org/sms/result/term1_mid.php?id={p_sid}&section=14&cls={p_cid}"
        try:
            mid_html = fetch_with_retry(mid_url, timeout=12, max_retries=3)
            subjs = parse_midterm_html(mid_html)
            for sub in subjs:
                cid = resolve_course_id(sub['subject'])
                if not cid:
                    continue

                cur.execute("""
                    INSERT INTO grades (
                        student_id, course_id, class_id, score, max_score,
                        assignment_score, project_score, mid_term_test, ca1,
                        academic_session, academic_term, status, graded_by
                    ) VALUES (
                        %s, %s, %s, %s, 20.00,
                        %s, %s, %s, %s,
                        '2026/2027', '1st Term', 'published', 3
                    )
                    ON DUPLICATE KEY UPDATE
                        score = VALUES(score),
                        max_score = 20.00,
                        assignment_score = VALUES(assignment_score),
                        project_score = VALUES(project_score),
                        mid_term_test = VALUES(mid_term_test),
                        ca1 = VALUES(ca1),
                        ca2 = NULL,
                        exam = NULL,
                        status = 'published'
                """, (uid, cid, class_id, sub['total'], sub['note'], sub['project'], sub['test'], sub['total']))
                class_grades_count += 1
            total_students_processed += 1
        except Exception as e:
            pass

    conn.commit()
    total_grades_upserted += class_grades_count
    elapsed_c = round(time.time() - class_t0, 1)
    print(f"✓ {c_name}: {len(student_items)} students, {class_grades_count} grades synced ({elapsed_c}s)")

total_elapsed = round(time.time() - start_time, 1)
print("=" * 70)
print(f"🎉 COMPLETED: {total_students_processed} students, {total_grades_upserted} grades synced in {total_elapsed}s")
print("=" * 70)
