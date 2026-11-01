import json
with open('docs/client-requirements/requirements-with-status.json', 'r', encoding='utf-8') as f:
    reqs = json.load(f)
for r in reqs:
    if r.get('status') == 'Unknown':
        print(r['req_id'], '|', r['module'], '|', r['requirement'][:80])