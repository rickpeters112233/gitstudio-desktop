import os
import zipfile

def pack():
    workspace_root = os.getcwd()
    output_zip = os.path.join(workspace_root, 'public', 'gitstudio-desktop.zip')
    
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
        'start-gitstudio.bat',
        'init-git-repo.bat',
        'pull-all-workspaces.bat',
        'pull-all-workspaces.ps1',
        'clone-all-workspaces.ps1',
    ]
    
    dirs_to_include = ['src', 'reports', 'public']
    
    print(f"Creating zip at: {output_zip}")
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in files_to_include:
            full = os.path.join(workspace_root, f)
            if os.path.exists(full):
                zf.write(full, f)
                print(f"  Added file: {f}")
        
        for d in dirs_to_include:
            dir_full = os.path.join(workspace_root, d)
            if os.path.exists(dir_full):
                for root, _, files in os.walk(dir_full):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, workspace_root)
                        # Skip existing zip file to avoid recursion
                        if rel_path.endswith('gitstudio-desktop.zip'):
                            continue
                        zf.write(full_path, rel_path)
                        print(f"  Added: {rel_path}")

    print("Zip created successfully.")

if __name__ == '__main__':
    pack()
