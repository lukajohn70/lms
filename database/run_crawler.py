#!/usr/bin/env python3
"""
DLHS Portal Data Extractor
Extracts all classes, students, subjects, terminal results, and assessments from dlhsportal.org
Saves JSON files into /Applications/MAMP/htdocs/lms/database/portal_extract/
"""

import urllib.request, urllib.parse, ssl, re, json, os, time, sys

EXTRACT_DIR = '/Applications/MAMP/htdocs/lms/database/portal_extract'
os.makedirs(EXTRACT_DIR, exist_ok=True)

# Cookie setup
COOKIE_FILE = '/tmp/dlhs_cookies.txt'
with open(COOKIE_FILE, 'r') as f:
    cookies = [f'{p[5]}={p[6]}' for line in f if not line.startswith('#') and line.strip() for p in [line.strip().split('\t')] if len(p)>=7]
COOKIE_STR = '; '.join(cookies)

HEADERS = {
    'Cookie': COOKIE_STR,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://dlhsportal.org/sms/admin/index'
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_url(url, post_data=None, timeout=20):
    try:
        data = urllib.parse.urlencode(post_data).encode() if post_data else None
        req = urllib.request.Request(url, data=data, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

print("=== DLHS PORTAL COMPREHENSIVE DATA EXTRACTOR ===")

# 1. Load Classes
classes_file = os.path.join(EXTRACT_DIR, 'classes.json')
with open(classes_file) as f:
    classes = json.load(f)

# 2. Extract All Students across all classes
print("\n--- STEP 1: Extracting All Students ---")
students_list = []
seen_ids = set()

for cid, cinfo in classes.items():
    cname = cinfo['name']
    upper = cname.upper()
    if upper in ['NULL', 'NILL']:
        continue
        
    print(f"Fetching students in class: {cname} (ID: {cid})...")
    html = fetch_url('https://dlhsportal.org/sms/admin/list_students.php', {'class_ID': cid})
    
    # Parse table rows
    rows = re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', html)
    class_students = 0
    for r in rows:
        id_match = re.search(r'edit_student\.php\?id=(\d+)', r) or re.search(r'id=(\d+)', r)
        if not id_match:
            continue
        sid = int(id_match.group(1))
        if sid in seen_ids:
            continue
            
        tds = re.findall(r'<td[^>]*>([\s\S]*?)</td>', r)
        cleaned = [re.sub(r'<[^>]+>', ' ', t).strip() for t in tds]
        if len(cleaned) < 3:
            continue
            
        # Extract fields
        name = cleaned[1] if len(cleaned) > 1 else ""
        email_match = re.search(r'([a-zA-Z0-9_.+-]+@dlhs\.org)', r)
        email = email_match.group(1) if email_match else f"student{sid}@dlhs.org"
        
        # Parent if available
        parent = cleaned[2] if len(cleaned) > 3 and not '@' in cleaned[2] else ""
        
        students_list.append({
            'student_id': sid,
            'name': name,
            'email': email,
            'parent': parent,
            'class_id': int(cid),
            'class_name': cname,
            'section': cinfo.get('section', 'Junior'),
            'dept': cinfo.get('dept', 'General')
        })
        seen_ids.add(sid)
        class_students += 1
        
    print(f"  → Found {class_students} students.")
    time.sleep(0.15)

print(f"\nTotal unique students discovered: {len(students_list)}")
with open(os.path.join(EXTRACT_DIR, 'all_students_basic.json'), 'w') as f:
    json.dump(students_list, f, indent=2)

# 3. Enrich Students with Admission Number, Gender, DOB from student_profile.php
print("\n--- STEP 2: Fetching Admission Numbers & Profiles ---")
profile_count = 0
for stu in students_list:
    sid = stu['student_id']
    profile_html = fetch_url(f'https://dlhsportal.org/sms/admin/student_profile.php?id={sid}')
    
    # Admission Number / Roll number
    roll_m = re.search(r'Roll number:?</td>\s*<td>\s*([^<]+)', profile_html, re.I)
    stu['admission_number'] = roll_m.group(1).strip() if roll_m else f"DLHS/{sid}"
    
    # Gender
    gender_m = re.search(r'Gender\s*</td>\s*<td>\s*([^<]+)', profile_html, re.I)
    stu['gender'] = gender_m.group(1).strip().upper() if gender_m else "MALE"
    if stu['gender'].startswith('F'):
        stu['gender'] = 'FEMALE'
    else:
        stu['gender'] = 'MALE'
        
    # DOB
    dob_m = re.search(r'Date of Birth\s*</td>\s*<td>\s*([^<]+)', profile_html, re.I)
    stu['dob'] = dob_m.group(1).strip() if dob_m else None

    profile_count += 1
    if profile_count % 25 == 0 or profile_count == len(students_list):
        print(f"  Enriched profiles: {profile_count}/{len(students_list)}")
    time.sleep(0.05)

with open(os.path.join(EXTRACT_DIR, 'all_students_full.json'), 'w') as f:
    json.dump(students_list, f, indent=2)

print("\n--- STEP 3: Extracting Terminal Results for All Students ---")
# Academic Sessions to query
sessions = [
    {'id': '9', 'name': '2023/2024'},
    {'id': '12', 'name': '2024/2025'},
    {'id': '13', 'name': '2025/2026'},
    {'id': '14', 'name': '2026/2027'}
]
terms = [
    {'code': 'term1', 'name': '1st Term', 'page': 'student_result_term1'},
    {'code': 'term2', 'name': '2nd Term', 'page': 'student_result_term2'},
    {'code': 'term3', 'name': '3rd Term', 'page': 'student_result_term3.php'}
]

all_grades = []
assessments = []

# Process students by class to map results efficiently
student_lookup = {s['student_id']: s for s in students_list}

def parse_result_html(html, student_id, sess_name, term_name):
    # Parse Part 1 (Mid-Term)
    mid_scores = {}
    part1_m = re.search(r'First Term Mid-Term Result:([\s\S]*?)Report sheet for', html) or \
              re.search(r'Mid-Term Result:([\s\S]*?)Report sheet', html)
    if part1_m:
        for row in re.findall(r'<tr>([\s\S]*?)</tr>', part1_m.group(1)):
            tds = re.findall(r'<td[^>]*>([\s\S]*?)</td>', row)
            c = [re.sub(r'<[^>]+>', '', t).strip() for t in tds]
            if len(c) >= 5 and c[0] and not 'cumulative' in c[0].lower():
                subj = c[0]
                try:
                    asgn = float(c[1]) if c[1] and c[1]!='---' else 0.0
                    proj = float(c[2]) if c[2] and c[2]!='---' else 0.0
                    test = float(c[3]) if c[3] and c[3]!='---' else 0.0
                    mid_scores[subj] = {'assignment': asgn, 'project': proj, 'mid_test': test}
                except:
                    pass

    # Parse Part 2 (End of Term: CA1, CA2, Exam, Total)
    part2_scores = []
    part2_m = re.search(r'Report sheet for([\s\S]*?)(?:<table[\s\S]*?</table>|\Z)', html)
    target_block = part2_m.group(1) if part2_m else html
    
    for row in re.findall(r'<tr>([\s\S]*?)</tr>', target_block):
        tds = re.findall(r'<td[^>]*>([\s\S]*?)</td>', row)
        c = [re.sub(r'<[^>]+>', '', t).strip() for t in tds]
        if len(c) >= 5 and c[0] and not any(x in c[0].lower() for x in ['cumulative', 'subjects', 'total', 'average']):
            subj = c[0]
            try:
                ca1 = float(c[1]) if c[1] and c[1]!='---' else 0.0
                ca2 = float(c[2]) if c[2] and c[2]!='---' else 0.0
                exam = float(c[3]) if c[3] and c[3]!='---' else 0.0
                tot = float(c[4]) if c[4] and c[4]!='---' else (ca1 + ca2 + exam)
                rem = c[7] if len(c) > 7 else ""
                
                # Check if there is actual score recorded
                if ca1 > 0 or ca2 > 0 or exam > 0 or tot > 0:
                    mid = mid_scores.get(subj, {})
                    part2_scores.append({
                        'student_id': student_id,
                        'subject': subj,
                        'session': sess_name,
                        'term': term_name,
                        'ca1': ca1,
                        'ca2': ca2,
                        'exam': exam,
                        'score': tot,
                        'remarks': rem,
                        'assignment_score': mid.get('assignment', None),
                        'project_score': mid.get('project', None),
                        'mid_term_test': mid.get('mid_test', None)
                    })
            except Exception as ex:
                pass
                
    return part2_scores

processed = 0
for sess in sessions:
    s_id = sess['id']
    s_name = sess['name']
    print(f"\nProcessing Session: {s_name}...")
    
    for c_id, cinfo in classes.items():
        c_name = cinfo['name']
        upper = c_name.upper()
        if upper in ['NULL', 'NILL']:
            continue
            
        cat = 'J' if 'BASIC' in upper else 'S'
        
        # Query list_std_result for this class and session
        res_list_html = fetch_url(f'https://dlhsportal.org/sms/admin/list_std_result.php?class_ID={c_id}&sec={s_id}&secname={s_name}&cat={cat}')
        student_ids_in_class = [int(m) for m in re.findall(r'id=(\d+)', res_list_html)]
        student_ids_in_class = list(set(student_ids_in_class))
        
        if not student_ids_in_class:
            continue
            
        print(f"  Class {c_name}: {len(student_ids_in_class)} students with results in {s_name}")
        
        for sid in student_ids_in_class:
            for t in terms:
                t_code = t['code']
                t_name = t['name']
                t_page = t['page']
                
                # Primary terminal result page
                url = f'https://dlhsportal.org/sms/admin/{t_page}?id={sid}&section={s_id}&class_ID={c_id}&secn={s_name}&cat={cat}'
                html = fetch_url(url)
                
                # Fallback to old_result if needed
                if len(html) < 2000:
                    url_alt = f'https://dlhsportal.org/sms/admin/old_result.php?section={s_id}&term={t_code}&id={sid}'
                    html = fetch_url(url_alt)
                    
                grades = parse_result_html(html, sid, s_name, t_name)
                for g in grades:
                    g['class_id'] = int(c_id)
                all_grades.extend(grades)
                
            processed += 1
            if processed % 20 == 0:
                print(f"    Processed {processed} student result sheets (Extracted {len(all_grades)} subject grades so far)...")
            time.sleep(0.04)

print(f"\nTotal Subject Grade Records Extracted: {len(all_grades)}")
with open(os.path.join(EXTRACT_DIR, 'all_terminal_grades.json'), 'w') as f:
    json.dump(all_grades, f, indent=2)

print("\n=== EXTRACTION FINISHED SUCCESSFULLY ===")
