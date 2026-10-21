"""Summarize existing measured evidence without granting acceptance."""
from pathlib import Path
import hashlib,json,shutil
root=Path('docs/anim-report/conver10-approved-repair-2026-10-21');exp=root/'experiments';exp.mkdir(exist_ok=True);entries=[]
for folder in sorted(Path('.local/rig-candidates').glob('approved-*')):
    record={'directory':str(folder),'accepted':False,'activated':False,'evidence':{}}
    for name in ['input.json','heat-solve.json','export.json','bind.json','receipt.json','feasibility-input.json','solve.json']:
        f=folder/name
        if f.exists():
            raw=f.read_bytes();record['evidence'][name]={'sha256':hashlib.sha256(raw).hexdigest(),'data':json.loads(raw)}
    if record['evidence']:
        target=exp/(folder.name+'.json');target.write_text(json.dumps(record,indent=2)+'\n');entries.append({'file':target.name,'candidate':folder.name,'accepted':False})
(exp/'index.json').write_text(json.dumps({'scope':'Staging receipts include failures. No candidate accepted or activated. GLBs remain local; original sources stay unchanged. Prefix approved names the approved work plan, not approved assets.','entries':entries},indent=2)+'\n')
labels=[('H01','Trước fit hai pose','H01-geodesic-before-two-poses-surface.json'),('H01','Sau fit hai pose','H01-geodesic-cp-v1-surface.json'),('H02','Trước fit hai pose','H02-geodesic-before-two-poses-surface.json'),('H02','Sau fit hai pose','H02-geodesic-cp-v3-surface.json'),('H01','Field helper riêng, chưa fit','H01-pronation-field-v1-surface.json'),('H02','Field helper riêng, chưa fit','H02-pronation-field-v1-surface.json')]
rows=[]
for hero,label,file in labels:
    data=json.loads((root/file).read_text())
    for i,pose in enumerate(data['poses']):
        for m in pose['meshes']:
            rows.append({'hero':hero,'trial':label,'pose':'crouch mở tay'if i==0 else'crouch + stress nắm','report':file,'assetSha256':data['sha256'],'p999':m['p999'],'maximum':m['maximum'],'minimum':m['minimum'],'minimumAreaRatio':m['minimumAreaRatio'],'minimumY':m['minimumY'],'edges':m['edges'],'triangles':m['triangles'],'skinPassed':m['passed'],'accepted':False})
lines=['# Số đo staging và kết quả kiểm', '', 'Đo bằng Node/Three và LBS độc lập trên cloud, không phải FPS hoặc nghiệm thu điện thoại. Mỗi dòng là một pose trên toàn bộ source mesh; cả hai pose dùng cùng hash trước/sau tương ứng. Ngưỡng giữ nguyên: p99,9 ≤ 1,5× và max ≤ 2,0×. Không dùng số liệu này thay kiểm toàn chuỗi.', '', '**Mọi mẫu ở bảng vẫn chưa đạt.** Mẫu CP tốt nhất chưa tích hợp field helper mới; field helper được đo riêng, chưa tối ưu và chưa qua nghiệm thu. Chưa kiểm chấp nhận compression/normal, giao cắt, foot slide hoặc bề mặt nắm cán trong toàn chuỗi.', '', '| Hero / mẫu | Pose | p99,9 | Max | Min cạnh | Min diện tích | Min Y (m) | Đạt skin của pose |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |']
for r in rows:lines.append(f"| {r['hero']} / [{r['trial']}]({r['report']}) | {r['pose']} | {r['p999']:.6f} | {r['maximum']:.6f} | {r['minimum']:.6g} | {r['minimumAreaRatio']:.6g} | {r['minimumY']:.6f} | {'Có'if r['skinPassed'] else'Không'} |")
lines+=['', 'Min cạnh/diện tích rất nhỏ là tín hiệu nén/fold cần kiểm tiếp; qua ngưỡng giãn không chứng minh hình dáng tự nhiên. Min Y thuộc toàn mesh, chưa được phân loại là ủng, tay hay áo. Không gọi đây là số đo chân khi chưa có mask giải phẫu được kiểm.', '', '## Runtime đang dùng', '', 'Các asset mới không được đăng ký vào runtime. Trên đúng body legacy hiện hành, phép đo Entrance/Hold mới vẫn thấy mọi mẫu nhìn thấy đều trượt:']
goal=json.loads((root/'goal-latest.json').read_text());surface=json.loads((Path(goal['iteration'])/'surface.json').read_text())
for h,r in surface['heroes'].items():
    rates=', '.join(f"{s['hz']}Hz: {s['failures']}/{s['visible']} mẫu hiển thị trượt"for s in r['sampleRates']);lines.append(f"- {h}: max {r['worstMaximum']:.6f}×; p99,9 lớn nhất {r['worstP999']:.6f}×; {rates}.")
lines+=['', 'Không so trực tiếp các số runtime này với staging để khẳng định đã sửa APK: LOD, weight và chuyển động khác nhau.', '', '## Lệnh kiểm gần nhất', '', f"Source fingerprint: `{goal['sourceHash']}`. Mã nguồn giữ ổn định trong vòng kiểm: `{goal['stableSource']}`. Log đầy đủ: [{goal['iteration'].split('/')[-1]}]({goal['iteration'].split(root.as_posix()+'/')[-1]}/goal.json).", '', '| Kiểm | Kết quả |', '| --- | --- |']
iteration=Path(goal['iteration'])
for name,label in [('test.log','npm test'),('test-master.log','npm run test:master'),('verify-master.log','npm run verify:master'),('goal-rig.log','npm run goal:rig')]:
    text=(iteration/name).read_text();summary=' / '.join(line for line in text.splitlines()if line.startswith('ℹ tests')or line.startswith('ℹ pass')or line.startswith('ℹ fail')or 'Master Prompt:'in line or 'RIG/APK GOAL BLOCKED'in line);lines.append('| '+label+' | '+summary.replace('|','\\|')+' |')
lines+=['| npm run goal:animation | INCOMPLETE; xem goal-latest.json, không tính trung bình phần trăm |','| npm run build | Đã chạy thành công; kiểm web production, chưa phát hành APK mới |','| npm run android:apk | Chưa chạy trong vòng này: điều kiện rig/skin trước APK chưa đạt |','','Các lần thử CLARABEL và bone heat thất bại được giữ trong `logs/` và biên nhận. Infeasible của một patch SOCP có boundary cố định không chứng minh toàn bộ rig không thể sửa. Các phép thử không được dùng để đổi giới hạn kiểm.']
(root/'STAGING-MEASUREMENTS.md').write_text('\n'.join(lines)+'\n');(root/'staging-measurements.json').write_text(json.dumps({'scope':'Measured frozen poses only; no activation or acceptance','rows':rows},indent=2)+'\n')
logs=root/'logs';logs.mkdir(exist_ok=True)
for f in sorted(Path('.local').glob('approved-*.log')):shutil.copyfile(f,logs/f.name.removeprefix('approved-'))
print('Archived',len(entries),'candidate receipts and',len(rows),'measured pose rows')
