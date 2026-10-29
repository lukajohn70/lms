#!/usr/bin/env python3
"""
DLHS Assessments & Photos Importer
Extracts attendance, class teacher comments, principal remarks, and character/psychomotor traits
from dlhsportal.org for 2023/2024, 2024/2025, and 2025/2026 sessions into aroura.student_assessments.
Uses thread-safe static session headers and focuses on students with recorded grades.
"""

import urllib.request
import urllib.parse
import ssl
import http.cookiejar
import re
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import pymysql

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
PORTAL_EMAIL     = 'ictkaduna@deeperlifehighschool.org'
PORTAL_PASS      = '12'

SESSIONS = {
    '13': '2025/2026',
    '12': '2024/2025',
    '9':  '2023/2024'
}

PAGE_MAP = {
    '1st Term': 'term1_result.php',
    '2nd Term': 'term2_main.php',
    '3rd Term': 'term3_main.php'
}

EXTRACT_DIR = '/Applications/MAMP/htdocs/lms/database/portal_extract'
AVATAR_DIR  = '/Applications/MAMP/htdocs/lms/uploads/avatars'
CACHE_FILE  = os.path.join(EXTRACT_DIR, 'student_assessments_extracted.json')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get_session_cookie():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPSHandler(context=ctx)
    )
    req = urllib.request.Request(
        PORTAL_LOGIN_URL,
        data=urllib.parse.urlencode({
            'email': PORTAL_EMAIL,
            'password': PORTAL_PASS,
            'user_type': 'admin',
            'submit': 'yes'
        }).encode(),
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    res = opener.open(req)
    html = res.read().decode('utf-8', errors='ignore')
    if 'logout' not in html.lower() and 'dashboard' not in html.lower():
        print("❌ Failed to log in to DLHS Portal")
        sys.exit(1)
    
    cookie_str = None
    for c in cj:
        if c.name == 'PHPSESSID':
            cookie_str = f"PHPSESSID={c.value}"
            break
    if not cookie_str:
        cookie_str = '; '.join([f"{c.name}={c.value}" for c in cj])
        
    print(f"✅ Authenticated. Session Cookie: {cookie_str}")
    return cookie_str

def parse_assessment_html(html):
    res = {}
    
    # 1. Attendance
    m_p = re.search(r'DAYS PRESENT</td>\s*<td[^>]*>(\d+)</td>', html, re.I) or re.search(r'<td>Present</td>\s*<td>(\d+)</td>', html, re.I)
    m_a = re.search(r'DAYS ABSENT</td>\s*<td[^>]*>(\d+)</td>', html, re.I) or re.search(r'<td>Absent</td>\s*<td>(\d+)</td>', html, re.I)
    m_t = re.search(r'TOTAL NUMBER OF DAYS</td>\s*<td[^>]*>(\d+)</td>', html, re.I) or re.search(r'<td>Total number of days</td>\s*<td>(\d+)</td>', html, re.I)
    
    present = int(m_p.group(1)) if m_p else 0
    absent  = int(m_a.group(1)) if m_a else 0
    total   = int(m_t.group(1)) if m_t else (present + absent)
    if total < present: total = present + absent
    
    res['days_present'] = present
    res['days_absent']  = absent
    res['total_days']   = total
    
    # 2. Comments
    m_tc = re.search(r'Class Teacher\'?s? Comment:?</th>\s*<td[^>]*>([\s\S]*?)</td>', html, re.I)
    if m_tc:
        c = re.sub(r'<[^>]+>', ' ', m_tc.group(1)).strip()
        res['class_teacher_comment'] = c if c.lower() not in ['no comment entered', 'no comment', 'none', '---', 'nill', 'null', ''] else None
    else:
        res['class_teacher_comment'] = None
        
    m_pr = re.search(r'Principal\'?s? Comment:?</th>\s*<td[^>]*>([\s\S]*?)</td>', html, re.I)
    if m_pr:
        c = re.sub(r'<[^>]+>', ' ', m_pr.group(1)).strip()
        res['principal_remark'] = c if c.lower() not in ['no comment entered', 'no comment', 'none', '---', 'nill', 'null', ''] else None
    else:
        res['principal_remark'] = None

    # 3. Behavioral traits
    def get_pt(trait):
        m = re.search(rf'<td[^>]*>{trait}</td>\s*<td[^>]*>(\d+)</td>', html, re.I)
        return int(m.group(1)) if m else None

    res['punctuality']        = get_pt('Punctuality')
    res['attitude_to_work']   = get_pt('Home Work') or get_pt('Attitude')
    res['handwriting']        = get_pt('Handwriting')
    res['honesty']            = get_pt('Honesty')
    res['sports']             = get_pt('Sport') or get_pt('Sports')
    res['politeness']         = get_pt('Politeness')
    res['neatness']           = get_pt('Neatness')
    res['leadership']         = get_pt('Leadership')
    res['emotional_stability']= get_pt('Attitude')
    res['team_spirit']        = get_pt('Team Spirit')

    has_data = (
        present > 0 or total > 0 or 
        bool(res['class_teacher_comment']) or 
        bool(res['principal_remark']) or 
        any(res[k] is not None and res[k] > 0 for k in ['punctuality', 'attitude_to_work', 'handwriting', 'honesty', 'sports'])
    )
    res['has_data'] = has_data
    return res

def main():
    print("=" * 80)
    print("🚀 DLHS ASSESSMENTS, COMMENTS & ATTENDANCE IMPORTER")
    print("=" * 80)

    cookie_header = get_session_cookie()

    # Load portal students mapping
    with open(os.path.join(EXTRACT_DIR, 'all_students_full.json')) as f:
        portal_students = json.load(f)

    # Build admission to portal_id map
    adm_to_portal_id = {}
    for ps in portal_students:
        adm = ps.get('admission_number')
        if adm:
            adm_to_portal_id[adm] = ps['student_id']

    # Connect to MySQL DB
    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Find candidate (student_id, academic_session, academic_term, class_id) in DB grades
    cur.execute("""
        SELECT DISTINCT g.student_id, g.academic_session, g.academic_term, g.class_id, u.admission_number, CONCAT(u.first_name, ' ', u.last_name) as student_name
        FROM grades g
        JOIN users u ON g.student_id = u.id
        WHERE g.academic_session IN ('2023/2024', '2024/2025', '2025/2026')
        ORDER BY g.academic_session DESC, g.academic_term ASC
    """)
    target_rows = cur.fetchall()
    print(f"📊 Distinct student grade targets in DB: {len(target_rows)}")

    # Reverse session map
    session_to_sec = {v: k for k, v in SESSIONS.items()}

    tasks = []
    for r in target_rows:
        adm = r['admission_number']
        portal_id = adm_to_portal_id.get(adm)
        if not portal_id:
            continue
            
        sec_id = session_to_sec.get(r['academic_session'])
        page = PAGE_MAP.get(r['academic_term'])
        if sec_id and page:
            tasks.append({
                'portal_id': portal_id,
                'user_id': r['student_id'],
                'class_id': r['class_id'],
                'name': r['student_name'],
                'sec_id': sec_id,
                'session': r['academic_session'],
                'term': r['academic_term'],
                'page': page
            })

    print(f"📋 Total candidate assessments to fetch: {len(tasks)}")

    # Fetch function
    def fetch_assessment(t):
        url = f"https://dlhsportal.org/sms/result/{t['page']}?id={t['portal_id']}&section={t['sec_id']}"
        req = urllib.request.Request(
            url,
            headers={
                'Cookie': cookie_header,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            }
        )
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                data = parse_assessment_html(html)
                return t, data
        except Exception as e:
            return t, None

    imported_count = 0
    updated_attendance = 0
    updated_comments = 0
    updated_traits = 0

    insert_query = """
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
            class_id = VALUES(class_id),
            days_present = VALUES(days_present),
            days_absent = VALUES(days_absent),
            total_days = VALUES(total_days),
            class_teacher_comment = VALUES(class_teacher_comment),
            principal_remark = VALUES(principal_remark),
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

    print("⚡ Starting multi-threaded extraction (8 parallel workers)...")
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(fetch_assessment, t): t for t in tasks}
        completed = 0
        
        for future in as_completed(futures):
            completed += 1
            t, data = future.result()
            if data and data['has_data']:
                cur.execute(insert_query, {
                    'sid': t['user_id'],
                    'term': t['term'],
                    'session': t['session'],
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
                imported_count += 1
                if data['days_present'] > 0: updated_attendance += 1
                if data['class_teacher_comment'] or data['principal_remark']: updated_comments += 1
                if data['punctuality'] or data['attitude_to_work']: updated_traits += 1

                if imported_count % 20 == 0:
                    conn.commit()

            if completed % 100 == 0 or completed == len(tasks):
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                print(f"  Processed {completed}/{len(tasks)} ({completed/len(tasks)*100:.1f}%) in {elapsed:.1f}s ({rate:.1f} req/s) — {imported_count} assessments imported...")

    conn.commit()
    conn.close()

    print("\n" + "=" * 80)
    print("🎉 SYNCHRONIZATION COMPLETE")
    print("=" * 80)
    print(f"Total Student Assessments Created/Updated: {imported_count}")
    print(f"  ✓ Records with Attendance Data:          {updated_attendance}")
    print(f"  ✓ Records with Comments / Remarks:       {updated_comments}")
    print(f"  ✓ Records with Character/Psychomotor:    {updated_traits}")
    print("=" * 80)

if __name__ == '__main__':
    main()
