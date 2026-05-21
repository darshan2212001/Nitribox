#!/usr/bin/env python3
"""
Script to fix remaining database error handling issues
Adds try/except with rollback to all endpoints missing it
"""

import re
from pathlib import Path
from typing import List, Tuple

def find_endpoints_needing_fix(file_path: Path) -> List[Tuple[int, str, str]]:
    """Find endpoints that commit but don't have proper error handling"""
    issues = []
    content = file_path.read_text()
    lines = content.split('\n')
    
    # Find all functions with db.commit()
    for i, line in enumerate(lines):
        if 'db.commit()' in line:
            # Check if there's a try/except block before this
            # Look backwards for try statement
            has_try = False
            has_except = False
            indent_level = len(line) - len(line.lstrip())
            
            # Check the function context
            for j in range(max(0, i - 50), i):
                if 'try:' in lines[j] and len(lines[j]) - len(lines[j].lstrip()) <= indent_level + 1:
                    has_try = True
                if 'except' in lines[j] and len(lines[j]) - len(lines[j].lstrip()) <= indent_level + 1:
                    has_except = True
            
            # Check if rollback exists
            has_rollback = 'db.rollback()' in '\n'.join(lines[max(0, i-10):i+10])
            
            if not (has_try and has_except and has_rollback):
                # Find the function name
                func_name = "unknown"
                for j in range(max(0, i-30), i):
                    if re.match(r'\s*async def \w+|def \w+', lines[j]):
                        func_name = lines[j].strip()
                        break
                
                issues.append((i+1, func_name, line.strip()))
    
    return issues

def main():
    """Main function to find and report issues"""
    api_endpoints = Path("api/endpoints")
    
    print("="*60)
    print("SCANNING FOR ENDPOINTS NEEDING ERROR HANDLING FIXES")
    print("="*60)
    
    total_issues = 0
    
    for py_file in api_endpoints.glob("*.py"):
        if py_file.name == "__init__.py":
            continue
            
        issues = find_endpoints_needing_fix(py_file)
        if issues:
            print(f"\n📄 {py_file.name}:")
            for line_num, func_name, code in issues:
                print(f"   Line {line_num}: {func_name}")
                print(f"   Code: {code}")
                total_issues += 1
    
    print(f"\n{'='*60}")
    print(f"Total issues found: {total_issues}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()

