#!/usr/bin/env python3
"""
DLHS Complete Broadsheet & Score Extractor
Downloads all broadsheets across all classes, sessions, and terms from dlhsportal.org,
and compiles them into JSON files under database/portal_extract/broadsheets/.
"""

import os
import sys
import json
import re
import ssl
import urllib.request
import urllib.parse
import http.cookiejar
from concurrent.futures import ThreadPoolExecutor, as_completed

PORTAL_LOGIN_URL = 'https://dlhsportal.org/sms/login.php'
PORTAL_EMAIL     = 'ictkaduna@deeperlifehighschool.org'
PORTAL_PASSWORD  = '12'

EXTRACT_DIR = '/Applications/MAMP/htdocs/lms/database/portal_extract'
BROADSHEETS_DIR = os.path.join(EXTRACT_DIR, 'broadsheets')
os.makedirs(BROADSHEETS_DIR, exist_ok=True)

# SSL context
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cj),
    urllib.request.HTTPSHandler(context=ctx)
)

print("🔑 Authenticating with dlhsportal.org...")
login_payload = urllib.parse.urlencode({
    'email': PORTAL_EMAIL,
    'password': PORTAL_PASSWORD,
    'user_type': 'admin',
    'submit': 'yes'
}).encode()

req = urllib.request.Request(
    PORTAL_LOGIN_URL,
    data=login_payload,
    headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
)
resp = opener.open(req)
html = resp.read().decode('utf-8', errors='ignore')
if 'logout' not in html.lower() and 'dashboard' not in html.lower():
    print("❌ Login failed!")
    sys.exit(1)
print("✅ Authenticated successfully.")

# Load classes
with open(os.path.join(EXTRACT_DIR, 'classes.json')) as f:
    classes_data = json.load(f)

# Sessions: 13 = 2025/2026, 12 = 2024/2025, 9 = 2023/2024
SESSIONS = [
    ('13', '2025/2026'),
    ('12', '2024/2025'),
    ('9',  '2023/2024')
]

TERMS = [
    ('term1', '1st Term'),
    ('term2', '2nd Term'),
    ('term3', '3rd Term')
]

tasks = []
for cid, cinfo in classes_data.items():
    cname = cinfo.get('name', f"Class {cid}")
    for sec_id, sec_name in SESSIONS:
        for term_code, term_name in TERMS:
            tasks.append((cid, cname, sec_id, sec_name, term_code, term_name))

print(f"📋 Queued {len(tasks)} broadsheet download tasks across {len(classes_data)} classes...")

compiled_all = []
total_students_seen = 0
total_scores_seen = 0

def fetch_task(task):
    cid, cname, sec_id, sec_name, term_code, term_name = task
    url = f"https://dlhsportal.org/sms/admin/fetch_broadsheet_previous.php?class_ID={cid}&section_ID={sec_id}&term={term_code}"
    try:
        r = opener.open(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}))
        content = r.read().decode('utf-8', errors='ignore')
        data = json.loads(content)
        stus = data.get('students', [])
        subs = data.get('subjects', [])
        if stus:
            out_file = os.path.join(BROADSHEETS_DIR, f"class_{cid}_{sec_name.replace('/', '_')}_{term_code}.json")
            record = {
                'class_id': int(cid),
                'class_name': cname,
                'session_id': sec_id,
                'session': sec_name,
                'term_code': term_code,
                'term': term_name,
                'subjects': subs,
                'students': stus
            }
            with open(out_file, 'w') as out_f:
                json.dump(record, out_f, indent=2)
            return record
    except Exception as e:
        pass
    return None

downloaded_count = 0
with ThreadPoolExecutor(max_workers=6) as executor:
    futures = [executor.submit(fetch_task, t) for t in tasks]
    for future in as_completed(futures):
        rec = future.result()
        if rec:
            downloaded_count += 1
            st_count = len(rec['students'])
            sb_count = len(rec['subjects'])
            total_students_seen += st_count
            compiled_all.append(rec)
            print(f"  ✓ {rec['class_name']:22} | {rec['session']:9} | {rec['term']:8} -> {st_count:2} students, {sb_count:2} subjects")

# Save compiled file
compiled_file = os.path.join(EXTRACT_DIR, 'all_portal_broadsheets.json')
with open(compiled_file, 'w') as f:
    json.dump(compiled_all, f, indent=2)

print(f"\n🎉 Successfully downloaded {downloaded_count} complete broadsheets!")
print(f"📁 Saved to {BROADSHEETS_DIR} and consolidated into {compiled_file}")
