import os
import sys

def list_files(startpath):
    """List all files in the directory structure starting from startpath"""
    for root, dirs, files in os.walk(startpath):
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f'{indent}{os.path.basename(root)}/')
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            print(f'{sub_indent}{f}')

if __name__ == "__main__":
    print("Current working directory:", os.getcwd())
    print("\nDirectory structure:")
    list_files('.')
    
    print("\nChecking if main.py exists:")
    if os.path.exists('main.py'):
        print("main.py exists in the current directory")
        with open('main.py', 'r') as f:
            print("\nContents of main.py:")
            print(f.read())
    else:
        print("main.py doesn't exist in the current directory. Searching for it...")
        found = False
        for root, dirs, files in os.walk('.'):
            if 'main.py' in files:
                found = True
                main_path = os.path.join(root, 'main.py')
                print(f"Found main.py at: {main_path}")
                with open(main_path, 'r') as f:
                    print("\nContents of main.py:")
                    print(f.read())
                break
        if not found:
            print("main.py not found in the project directory.")
