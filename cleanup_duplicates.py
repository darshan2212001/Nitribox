#!/usr/bin/env python3
"""
Cleanup script to identify and remove duplicate/unwanted files
"""
import os
from pathlib import Path

# Files to KEEP (critical files)
KEEP_FILES = {
    "README.md",
    "API_DOCUMENTATION.md",
    "TESTING_DOCUMENTATION.md",
    "DEEP_ANALYSIS_REPORT.md",
    "STARTUP_GUIDE.md",
    "requirements.txt",
    "run_api.py",
    "start_ecosystem.py",
    "test_all_fixes.py",
    "fix_remaining_endpoints.py",
    "start_web_app.bat",
    "start_web_app.ps1",
    "start_all_services.ps1",
    "start_all_services.bat",
    "start_mobile_app.ps1",
    "start_mobile_app.bat",
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "tsconfig.json",
}

# Directories to KEEP entirely
KEEP_DIRS = {
    "api",
    "client",
    "mobile",
    "attached_assets",
    "test_results",
}

# Files to REMOVE (documentation/report files)
REMOVE_DOCS = [
    "FINAL_COMPLETION_REPORT.md",
    "COMPLETION_SUMMARY.md",
    "IMPLEMENTATION_PROGRESS_SUMMARY.md",
    "CRITICAL_FIXES_REPORT.md",
    "CRITICAL_FIXES_IMPLEMENTATION_REPORT.md",
    "AUTHENTICATION_FLOW_FIX_REPORT.md",
    "AUTHENTICATION_STATUS_REPORT.md",
    "FINAL_STATUS_REPORT.md",
    "FINAL_SUCCESS_REPORT.md",
    "ERROR_RESOLUTION_REPORT.md",
    "TESTING_REPORT.md",
    "TESTIMONIALS_ENHANCEMENT_REPORT.md",
    "WEB_MOBILE_UI_UX_COMPARISON_REPORT.md",
    "WEB_MOBILE_COMPARISON_REPORT.md",
    "DEEP_ANALYSIS_WEB_MOBILE_COMPARISON.md",
    "FINAL_DEBUGGING_REPORT.md",
    "COMPREHENSIVE_DEBUG_REPORT.md",
    "COMPREHENSIVE_TERMINAL_ISSUES_REPORT.md",
    "TERMINAL_STATUS_REPORT.md",
    "TERMINAL_STUCK_SOLUTION.md",
    "PERMANENT_SOLUTION_GUIDE.md",
    "PERSISTENT_ERRORS_ANALYSIS.md",
    "SOLUTION_SUMMARY.md",
    "EXECUTION_COMPLETE_REPORT.md",
    "CLEANUP_SUMMARY.md",
    "REMAINING_ISSUES.md",
    "ISSUES_FIXED.md",
    "DOCUMENTATION_SUMMARY.md",
    "COMPONENT_DOCUMENTATION.md",
    "COMPLETE_CODEBASE_DOCUMENTATION.md",
    "UI_UX_ENHANCEMENT_SUMMARY.md",
    "MOBILE_APP_100_PERCENT_COMPLETE.md",
    "MOBILE_APP_BUILD_SUMMARY.md",
    "FINAL_PARITY_CHECK.md",
    "NET_TODO_PLAN.md",
    "DEPLOYMENT_OPERATIONS_GUIDE.md",
    "COMPLETE_IMPLEMENTATION_REPORT.md",
    "PYDANTIC_VALIDATION_COMPLETE.md",
    "COMPREHENSIVE_ERROR_CHECK.md",
    "VALIDATION_IMPLEMENTATION_SUMMARY.md",
]

# Files to REMOVE (old/duplicate test files)
REMOVE_TESTS = [
    "test_1_api_health.py",
    "test_2_database.py",
    "test_3_endpoints.py",
    "test_4_sample_data.py",
    "test_4_sample_data_simple.py",
    "test_5_websocket.py",
    "test_api_simple.py",
    "run_comprehensive_tests.py",
    "run_deep_test_with_autofix.py",
    "run_parallel_tests.py",
    "run_simplified_test.py",
    "run_timed_tests.py",
    "quick_test.py",
    "collect_results.py",
    "create_placeholders.py",
    "run_test_1.bat",
    "run_test_2.bat",
    "run_test_3.bat",
    "run_test_4.bat",
    "run_test_5.bat",
    "run_tests_simple.bat",
    "launch_all_tests.bat",
    "start_parallel_tests.ps1",
    "start_quick_tests.ps1",
    "start_quick_tests_fixed.ps1",
]

# Files to REMOVE (temporary utility scripts)
REMOVE_UTILS = [
    "create_user.py",
    "create_test_user.py",
    "reset_user_password.py",
    "cleanup_processes.bat",
    "kill_processes.bat",
    "kill_processes.ps1",
    "kill-all-processes.ps1",
    "timeout_utils.py",
]

# Files to REMOVE (old JS test files)
REMOVE_JS_TESTS = [
    "client_portal_test.js",
    "comprehensive_test.js",
    "consultation_test.js",
    "cross_portal_test.js",
    "error_handling_test.js",
    "simple_client_test.js",
    "test_auth_flow.js",
    "test_auth.js",
    "test_realtime.js",
    "test_websocket.js",
]

def find_files_to_remove():
    """Find all files that should be removed"""
    root = Path(".")
    files_to_remove = []
    
    for file in REMOVE_DOCS + REMOVE_TESTS + REMOVE_UTILS + REMOVE_JS_TESTS:
        filepath = root / file
        if filepath.exists() and filepath.is_file():
            files_to_remove.append(filepath)
    
    # Check for nested duplicate directory
    nested_dir = root / "ZyaeLNutriBox" / "ZyaeLNutriBox"
    if nested_dir.exists() and nested_dir.is_dir():
        files_to_remove.append(("DIR", nested_dir))
    
    return files_to_remove

def main():
    """Main cleanup function"""
    print("=" * 60)
    print("CLEANUP: Finding Duplicate and Unwanted Files")
    print("=" * 60)
    
    files_to_remove = find_files_to_remove()
    
    if not files_to_remove:
        print("✅ No files to remove found.")
        return
    
    print(f"\nFound {len(files_to_remove)} files to remove:\n")
    
    for filepath in sorted(files_to_remove):
        size = filepath.stat().st_size
        print(f"  - {filepath.name} ({size:,} bytes)")
    
    # Calculate total size (only for files, not directories)
    file_paths = [f for f in files_to_remove if not isinstance(f, tuple)]
    total_size = sum(f.stat().st_size for f in file_paths) if file_paths else 0
    print(f"\nTotal size: {total_size:,} bytes")
    
    # Count directories
    dir_count = sum(1 for f in files_to_remove if isinstance(f, tuple))
    
    print("\nThese will be removed:")
    print("  - All temporary report/documentation files")
    print("  - Old duplicate test files")
    print("  - Temporary utility scripts")
    print("  - Old JavaScript test files")
    if dir_count > 0:
        print(f"  - {dir_count} nested duplicate directory(ies)")
    
    response = input("\nProceed with deletion? (yes/no): ")
    
    if response.lower() == "yes":
        print("\n🗑️  Removing files...")
        removed = 0
        dirs_removed = 0
        errors = 0
        
        for item in files_to_remove:
            try:
                if isinstance(item, tuple):
                    # It's a directory
                    dirpath = item[1]
                    import shutil
                    shutil.rmtree(dirpath)
                    print(f"✅ Removed directory: {dirpath.name}")
                    dirs_removed += 1
                else:
                    # It's a file
                    item.unlink()
                    print(f"✅ Removed: {item.name}")
                    removed += 1
            except Exception as e:
                name = item.name if not isinstance(item, tuple) else item[1].name
                print(f"❌ Error removing {name}: {e}")
                errors += 1
        
        print(f"\n✅ Removed {removed} files and {dirs_removed} directories")
        if errors > 0:
            print(f"⚠️  {errors} errors occurred")
    else:
        print("Cancelled.")

if __name__ == "__main__":
    main()

