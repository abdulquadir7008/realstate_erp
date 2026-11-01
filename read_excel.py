import openpyxl
import json

wb = openpyxl.load_workbook('Detailed_requirement_GESPL_V2_final.xlsx', data_only=True)
ws = wb['Detailed Requirements']

requirements = []
for row in ws.iter_rows(min_row=4, max_row=ws.max_row, values_only=True):
    if row[0]:  # Only rows with Req ID
        req = {
            'req_id': row[0],
            'owner': row[1],
            'module': row[2],
            'category': row[3],
            'requirement': row[4],
            'priority': row[5],
            'acceptance_criteria': row[6],
            'our_commit': row[7],
            'compliance': row[8],
            'vendor_remarks': row[9],
            'est_effort': row[10],
            'our_commit_2': row[11],
        }
        requirements.append(req)

# Print summary
modules = {}
for r in requirements:
    m = r['module']
    if m not in modules:
        modules[m] = {'Must': 0, 'Should': 0, 'Could': 0, 'Total': 0}
    modules[m][r['priority']] = modules[m].get(r['priority'], 0) + 1
    modules[m]['Total'] += 1

print("=== MODULE SUMMARY ===")
for m, counts in sorted(modules.items()):
    print(f"{m}: Must={counts.get('Must',0)}, Should={counts.get('Should',0)}, Could={counts.get('Could',0)}, Total={counts['Total']}")

print(f"\nTotal requirements: {len(requirements)}")

# Save as JSON
with open('docs/client-requirements/requirements.json', 'w', encoding='utf-8') as f:
    json.dump(requirements, f, indent=2, ensure_ascii=False)

print("\nSaved to docs/client-requirements/requirements.json")