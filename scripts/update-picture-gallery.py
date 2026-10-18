#!/usr/bin/env python3
"""Archive historical evidence images; register new captures without changing originals."""
import argparse, hashlib, json, re, subprocess
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'picture'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)
def group(path):
    if path.startswith('assets/tencent/'): return 'Tencent: ảnh concept và tham chiếu'
    if path.startswith('docs/visual-review/'): return 'Đại tu đồ họa và điều khiển' if '/overhaul-' in path else 'Kiểm tra mỹ thuật và giao diện game'
    for prefix, title in [
        ('docs/manual-assets/h01-c0/', 'Tích hợp model Lâm Dật'),
        ('docs/manual-assets/h01-entrance/', 'Hoạt ảnh xuất hiện Lâm Dật'),
        ('docs/manual-assets/h02-entrance/', 'Hoạt ảnh xuất hiện Hàn Trạch'),
        ('docs/perf-audit/', 'Sửa khởi động và kiểm tra hiệu năng'),
        ('docs/fidelity/', 'Đối chiếu chất lượng với GLB gốc'),
        ('docs/boot-performance/', 'Sửa vòng đời tải và hiển thị'),
        ('docs/rig-audit/', 'Kiểm tra và sửa rig H01 H02'),
        ('docs/review-conver10/', 'Kiểm tra và sửa rig H01 H02'),
        ('docs/hand-frames/', 'Kiểm tra và sửa rig H01 H02'),
        ('docs/anim-report/', 'Kiểm tra và sửa rig H01 H02')]:
        if path.startswith(prefix): return title
    return 'Ảnh kiểm tra khác'
def stamp(value):
    return datetime.fromisoformat(value).astimezone(ZoneInfo('Asia/Ho_Chi_Minh')).strftime('%Y-%m-%d %H:%M:%S UTC+07:00')
def blobhash(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', type=int)
    parser.add_argument('--image', type=Path)
    parser.add_argument('--title', help='Create a new task only for a new substantive request')
    args = parser.parse_args()
    BASE.mkdir(exist_ok=True)
    media = BASE / 'media'; media.mkdir(exist_ok=True)
    catalog = BASE / 'tasks.json'
    state = json.loads(catalog.read_text()) if catalog.exists() else {'tasks': []}
    tasks = state['tasks']
    log = git('log', '--all', '--reverse', '--format=@@%H%x09%cI', '--raw', '--no-abbrev', '--no-renames', '--diff-filter=AM', '--', 'docs', 'assets/tencent').decode()
    commit = date = None
    for line in log.splitlines():
        if line.startswith('@@'):
            commit, date = line[2:].split('\t'); continue
        if not line.startswith(':') or '\t' not in line: continue
        raw, path = line.split('\t', 1)
        if not re.search(r'\.(png|jpe?g|webp|gif)$', path, re.I): continue
        sha = raw.split()[3]
        title = group(path)
        task = next((t for t in tasks if t['title'] == title), None)
        if task is None:
            task = {'id': max([t['id'] for t in tasks], default=0)+1, 'title': title, 'images': []}; tasks.append(task)
        entry = next((e for e in task['images'] if e['blob'] == sha), None)
        if entry is None:
            data = git('cat-file', 'blob', sha)
            ext = '.png' if data.startswith(b'\x89PNG') else '.jpg' if data.startswith(b'\xff\xd8') else '.webp' if data[:4] == b'RIFF' else '.gif'
            filename = sha + ext
            target = media / filename
            if not target.exists(): target.write_bytes(data)
            entry = {'blob': sha, 'file': filename, 'time': date, 'time_kind': 'git', 'commit': commit, 'sources': []}
            task['images'].append(entry)
        if path not in entry['sources']: entry['sources'].append(path)
    if args.image:
        if not args.task: parser.error('--image requires --task')
        task = next((t for t in tasks if t['id'] == args.task), None)
        if task is None:
            if not args.title: parser.error('New task requires --title')
            task = {'id': args.task, 'title': args.title, 'images': []}; tasks.append(task)
        data = args.image.read_bytes(); sha = blobhash(data)
        if not any(e['blob'] == sha for e in task['images']):
            filename = sha + args.image.suffix.lower(); (media / filename).write_bytes(data)
            task['images'].append({'blob': sha, 'file': filename, 'time': datetime.now().astimezone().isoformat(), 'time_kind': 'registered', 'sources': [args.image.name]})
    for task in tasks:
        folder = BASE / ('conver' + str(task['id'])); folder.mkdir(exist_ok=True)
        lines = ['# Nhiệm vụ ' + str(task['id']) + ': ' + task['title'], '', '[Danh sách nhiệm vụ](../README.md)', '', 'Ảnh được giữ nguyên dữ liệu. Thời gian ảnh cũ là lúc lưu trên Git, không phải giờ chụp đã xác minh.', '']
        for i, entry in enumerate(task['images'], 1):
            file = media / entry['file']
            assert file.exists() and blobhash(file.read_bytes()) == entry['blob'], file
            lines += ['## Ảnh ' + str(i), '', '![' + entry['sources'][0].split('/')[-1] + '](../media/' + entry['file'] + ')', '', '**Thời gian ' + ('lưu trên Git' if entry['time_kind'] == 'git' else 'đăng ký ảnh') + ': ' + stamp(entry['time']) + '**', '', 'Nguồn: ' + ', '.join('`' + s + '`' for s in entry['sources']), '']
            if entry.get('commit'): lines += ['[Commit lưu ảnh](https://github.com/oree-nguyen/Tutien/commit/' + entry['commit'] + ')', '']
        (folder / 'online-pic.md').write_text('\n'.join(lines))
    catalog.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
    count = sum(len(t['images']) for t in tasks)
    unique = len({e['blob'] for t in tasks for e in t['images']})
    lines = ['# Sổ ảnh Hồn Giới', '', f'{len(tasks)} nhiệm vụ · {count} mục ảnh · {unique} file ảnh khác nhau.', '', 'Số `converN` là số nhiệm vụ trong sổ ảnh này, được giữ ổn định; tin nhắn “Tiếp” không tạo số mới. Không suy đoán số thứ tự toàn bộ nhiệm vụ trong lịch sử trò chuyện.', '', 'Ảnh cũ được lấy từ toàn bộ lịch sử Git còn truy cập được trong `docs/` và ảnh concept/tham chiếu `assets/tencent/`, gồm cả phiên bản đã thay thế. Không bao gồm bộ texture/icon runtime hoặc tệp đính kèm trò chuyện không có trong repo. Giữ nguyên byte ảnh, dùng chung file khi trùng nội dung.', '', 'Thời gian hiển thị theo Việt Nam (UTC+7). Với ảnh cũ, chỉ xác minh được thời gian commit lưu phiên bản ảnh, không xác minh giờ chụp. Ảnh thêm bằng lệnh bên dưới ghi thời gian đăng ký thực tế, không tự nhận là giờ chụp.', '']
    for task in tasks: lines.append(f"- [Nhiệm vụ {task['id']}: {task['title']}](conver{task['id']}/online-pic.md) — {len(task['images'])} ảnh")
    lines += ['', '## Thêm ảnh mới', '', 'Ngay sau khi chụp hoặc xem ảnh mới, dùng lại số nhiệm vụ đang làm:', '', '```bash', 'python3 scripts/update-picture-gallery.py --task N --image path/to/screenshot.png', '```', '', 'Chỉ khi nhận nhiệm vụ mới: chọn số kế tiếp và thêm `--title "Tên nhiệm vụ"`. Chạy không tham số để đồng bộ ảnh kiểm tra từ lịch sử Git. Commit và push ảnh cùng Markdown để người dùng xem được trên GitHub.', '']
    (BASE / 'README.md').write_text('\n'.join(lines))
    print(f'{len(tasks)} tasks; {count} entries; {unique} unique images')
if __name__ == '__main__': main()
