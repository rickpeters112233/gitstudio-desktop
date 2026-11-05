import os
import json
import hashlib
import zipfile
import datetime

VERSION = "2.5.1"

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def pack():
    workspace_root = os.getcwd()
    releases_dir = os.path.join(workspace_root, 'public', 'releases')
    os.makedirs(releases_dir, exist_ok=True)

    versioned_filename = f"gitstudio-desktop_v{VERSION}.zip"
    versioned_path = os.path.join(releases_dir, versioned_filename)
    latest_path = os.path.join(workspace_root, 'public', 'gitstudio-desktop.zip')
    
    files_to_include = [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'metadata.json',
        '.gitignore',
        '.env.example',
        'server.ts',
        'masterCatalog.json',
        'PROJECT_INSTRUCTIONS.md',
        'INSTRUCTIONS.txt',
        'RUN_GUI.bat',
        'BUILD_EXE.bat',
        'git_tools_gui.py',
        'git_pull_all.py',
        'github_daily_report.py',
        'start-gitstudio.bat',
        'start-gitstudio.ps1',
        'init-git-repo.bat',
        'pull-all-workspaces.bat',
        'pull-all-workspaces.ps1',
        'clone-all-workspaces.ps1',
    ]
    
    dirs_to_include = ['src', 'reports', 'public']
    
    print(f"Creating versioned archive: {versioned_path}")
    with zipfile.ZipFile(versioned_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in files_to_include:
            full = os.path.join(workspace_root, f)
            if os.path.exists(full):
                zf.write(full, f)
                print(f"  Added: {f}")
        
        for d in dirs_to_include:
            dir_full = os.path.join(workspace_root, d)
            if os.path.exists(dir_full):
                for root, _, files in os.walk(dir_full):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, workspace_root)
                        # Skip zip files to prevent recursion
                        if rel_path.endswith('.zip'):
                            continue
                        zf.write(full_path, rel_path)

    import shutil
    shutil.copyfile(versioned_path, latest_path)

    sha = get_sha256(versioned_path)
    size = os.path.getsize(versioned_path)

    # Update releases manifest
    manifest_path = os.path.join(releases_dir, 'manifest.json')
    history = []
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as mf:
                history = json.load(mf)
        except Exception:
            history = []

    new_entry = {
        "version": VERSION,
        "filename": versioned_filename,
        "path": f"/releases/{versioned_filename}",
        "sizeBytes": size,
        "sha256": sha,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "changelog": [
            "Upgraded batch pull engine in server.ts with 5-step robust pipeline (fetch --prune, dead-branch resolution, auto-stash, pull origin <branch>, stash-restore)",
            "Configured clean desktop port 8888 in start-gitstudio.bat and start-gitstudio.ps1",
            "Added both Web UI and standalone desktop Python tools (git_tools_gui.py, RUN_GUI.bat, BUILD_EXE.bat)",
            "Saved permanent project instructions and release tracking manifest"
        ]
    }

    history = [e for e in history if e.get("version") != VERSION]
    history.insert(0, new_entry)

    with open(manifest_path, 'w', encoding='utf-8') as mf:
        json.dump(history, mf, indent=2)

    print(f"[SUCCESS] Versioned zip created: {versioned_filename} ({size} bytes, SHA256: {sha[:12]}...)")
    print(f"[SUCCESS] Updated releases manifest: {manifest_path}")

if __name__ == '__main__':
    pack()
