import csv
import json

with open('docs/client-requirements/requirements.json', 'r', encoding='utf-8') as f:
    requirements = json.load(f)

# CSV
with open('docs/client-requirements/requirements.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(requirements[0].keys()))
    writer.writeheader()
    writer.writerows(requirements)

print("Saved CSV")

# Markdown matrix
with open('docs/client-requirements/requirements-matrix.md', 'w', encoding='utf-8') as f:
    f.write("# GESPL Requirements Matrix\n\n")
    f.write(f"Total requirements: {len(requirements)}\n\n")
    f.write("| Req ID | Module | Category | Requirement | Priority | Acceptance Criteria | Our Commit | Compliance | Status | Evidence |\n")
    f.write("|--------|--------|----------|-------------|----------|---------------------|------------|------------|--------|----------|\n")
    for r in requirements:
        f.write(f"| {r['req_id']} | {r['module']} | {r['category']} | {r['requirement'][:100]}... | {r['priority']} | {str(r['acceptance_criteria'])[:80]}... | {r['our_commit']} | {r['compliance']} | **TBD** | *TBD* |\n")

print("Saved Markdown matrix")

# Also create a simplified view by module
with open('docs/client-requirements/requirements-by-module.md', 'w', encoding='utf-8') as f:
    f.write("# Requirements by Module\n\n")
    modules = {}
    for r in requirements:
        m = r['module']
        if m not in modules:
            modules[m] = []
        modules[m].append(r)
    
    for m, reqs in sorted(modules.items()):
        f.write(f"## {m} ({len(reqs)} requirements)\n\n")
        f.write("| Req ID | Category | Requirement | Priority | Acceptance Criteria |\n")
        f.write("|--------|----------|-------------|----------|---------------------|\n")
        for r in reqs:
            f.write(f"| {r['req_id']} | {r['category']} | {r['requirement'][:120]}... | {r['priority']} | {str(r['acceptance_criteria'])[:100]}... |\n")
        f.write("\n")

print("Saved by-module markdown")