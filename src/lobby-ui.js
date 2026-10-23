import { HEROES, SKILLS, SUPPORTS } from './data.js';
import { itemIcon, skillIcon } from './item-art.js';
import './lobby-ui.css';
import './lobby-reference.css';
import './lobby-fullscreen.css';

export const lobbyState = { view: 'home' };
export const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const lobbyIcon=(name,cls='')=>`<svg class="lobby-icon ${cls}" aria-hidden="true"><use href="/art/lobby/icons.svg#${name}"></use></svg>`;
const portrait = (hero, cls = '') => hero < 6
 ? `<span class="hero-portrait ref-portrait ${cls}" role="img" aria-label="${escapeText(HEROES[hero].name)}" style="--crop-x:${hero%2?232:60};--crop-y:${[158,158,347,347,535,535][hero]}"><img src="/art/lobby/atlas-roster.jpeg" alt="" aria-hidden="true"></span>`
 : `<img class="hero-portrait ${cls}" src="/art/portraits/H${String(hero + 1).padStart(2, '0')}.webp" alt="${escapeText(HEROES[hero].name)}" width="56" height="56">`;
const branchArt=(hero,index)=>hero===0?`<span class="reference-branch-art" style="--atlas-x:${[986,1116,1245][index]};--atlas-y:424" role="img" aria-label="${escapeText(HEROES[hero].branches[index])}"></span>`:`<img class="item-art" src="${skillIcon(hero,index)}" alt="${escapeText(HEROES[hero].branches[index])}">`;
const supportArt=id=>[1,5,18].includes(id)?`<span class="reference-branch-art" style="--atlas-x:${({1:986,5:1116,18:1245})[id]};--atlas-y:610" role="img" aria-label="${escapeText(SUPPORTS[id-1].name)}"></span>`:itemIcon('support',id,{label:SUPPORTS[id-1].name});
const iconButton = (action, icon, text) => `<button data-lobby-action="${action}"><span aria-hidden="true">${icon}</span><span>${text}</span></button>`;

export function pickerMarkup(label, options, value, attributes = '') {
  const choices=options.map(o=>({...o,value:String(o.value)}));
  const selected=choices.find(o=>o.value===String(value));
  return `<button type="button" class="slot-picker" ${attributes} aria-label="${escapeText(label)}" aria-haspopup="dialog" value="${escapeText(value)}" data-card-options="${escapeText(JSON.stringify(choices))}">${escapeText(selected?.text ?? 'Chọn')} ›</button>`;
}

/** Image-card drawers retain the existing purchase/validation change handlers. */
export function cardPickers(root = document) {
  for (const button of root.querySelectorAll('[data-card-options]:not([data-card-ready])')) {
    const options = JSON.parse(button.dataset.cardOptions);
    button.dataset.cardReady='true';
    const refresh = () => { button.textContent = `${options.find(o => o.value === button.value)?.text ?? 'Chọn'}  ›`; };
    refresh();
    button.onclick = () => {
      document.querySelector('.gear-drawer-backdrop')?.remove();
      const backdrop = document.createElement('div');
      backdrop.className = 'gear-drawer-backdrop';
      const title = button.getAttribute('aria-label') ?? 'Chọn trang bị';
      backdrop.innerHTML = `<section class="gear-drawer" role="dialog" aria-modal="true" aria-label="${escapeText(title)}"><header><h2>${escapeText(title)}</h2><button aria-label="Đóng bảng chọn">✕</button></header><div class="gear-card-grid">${options.map(o => {
        const id = +o.value;
        const art = button.dataset.ring ? (id ? itemIcon('ring', id, {label:o.text}) : '<span class="empty-slot">◇</span>') : button.id === 'skin' ? itemIcon('weapon', +button.dataset.heroIndex + 1, {skin:id,label:o.text}) : button.id === 'costume' ? portrait(+button.dataset.heroIndex) : '<span class="empty-slot">✧</span>';
        return `<button class="gear-option ${button.value === o.value ? 'active' : ''}" data-choice="${escapeText(o.value)}" ${o.disabled?'disabled':''}>${art}<span>${escapeText(o.text)}</span></button>`;
      }).join('')}</div></section>`;
      document.body.append(backdrop);
      const app=document.querySelector('#app'), wasInert=app.inert;app.inert=true;
      const close = () => { backdrop.remove(); app.inert=wasInert; button.focus(); document.removeEventListener('keydown', onKey); };
      const onKey = e => { if(e.key === 'Escape') { e.stopImmediatePropagation(); close(); } };
      document.addEventListener('keydown', onKey);
      backdrop.querySelector('header button').onclick = close;
      backdrop.onclick = e => { if(e.target === backdrop) close(); };
      backdrop.querySelectorAll('[data-choice]').forEach(option => option.onclick = () => {
        button.value = option.dataset.choice; refresh(); close(); button.dispatchEvent(new Event('change', {bubbles:true}));
      });
      backdrop.querySelector('.active, .gear-option')?.focus();
    };
  }
}

/** Move existing controls into explicit lobby screens without changing their gameplay bindings. */
export function composeLobby(app, { loadout, profile, online, money, action }) {
  const hub = app.querySelector('.hub');
  hub.classList.add('lobby-screen'); hub.dataset.view = lobbyState.view;
  const hero = HEROES[loadout.hero];
  const oldHeader = hub.querySelector(':scope > header');
  const fullscreen = oldHeader.querySelector('#fullscreen');
  const header = document.createElement('header'); header.className = 'lobby-topbar';
  header.innerHTML = `<button class="player-banner" data-lobby-action="profile" aria-label="Mở hồ sơ người chơi">${portrait(loadout.hero)}<span><strong>${escapeText(profile.displayName ?? profile.username ?? (online ? 'Hồn Sư trực tuyến' : 'Hồn Sư lữ hành'))}</strong><small>${escapeText(profile.rank ?? 'Chưa xếp hạng')} · ${online ? 'Trực tuyến' : 'Ngoại tuyến'}</small></span></button><div class="lobby-wallet"><button data-lobby-action="shop"><span class="jade-coin" aria-hidden="true"></span><span>Thanh Bảo<strong>${money(profile.tb)}</strong></span><b>＋</b></button><button data-lobby-action="premium"><span class="silver-coin" aria-hidden="true"></span><span>Ngân Bảo<strong>${money(profile.nb)}</strong></span><b>＋</b></button></div><div class="lobby-benefits">${iconButton('vip','','VIP')}${iconButton('weekly','','Thẻ tuần')}${iconButton('resources','','Tài nguyên')}</div>`;
  header.insertAdjacentHTML('beforeend','<div class="roster-brand"><span>魂</span><div>HỒN GIỚI<small>SINH TỒN · THƯƠNG MANG CỔ VỰC</small></div></div>');
  header.append(fullscreen); oldHeader.replaceWith(header);
  const left = hub.querySelector('.left-info'), inventory = hub.querySelector('.loadout-panel');
  const grid = left.querySelector('.hero-grid');
  const roster = document.createElement('aside'); roster.className = 'hero-roster lobby-panel';
  roster.innerHTML = '<header class="lobby-panel-header"><h2>DANH SÁCH HỒN SƯ</h2><span class="sr-only">12 võ hồn</span></header>';
  roster.append(grid); hub.append(roster);
  for(const card of grid.querySelectorAll('[data-hero]')) {
    const index = +card.dataset.hero;
    card.innerHTML = `${portrait(index)}<span class="hero-card-name">${escapeText(HEROES[index].name)}</span><small>${escapeText(HEROES[index].soul)}</small>`;
    card.setAttribute('aria-pressed', String(index === loadout.hero));
  }
  left.classList.add('character-panel','lobby-panel');
  left.querySelector('.eyebrow').remove();
  const title = document.createElement('header'); title.className = 'lobby-panel-header';
  title.innerHTML = '<h2>NHÂN VẬT</h2><button data-lobby-view="home" aria-label="Đóng Nhân vật">✕</button>';
  left.prepend(title);
  const identity = document.createElement('div'); identity.className = 'character-identity';
  identity.innerHTML = `${portrait(loadout.hero)}<div></div><button data-lobby-view="heroes" id="editHero" aria-label="Chọn Hồn Sư">${lobbyIcon('edit')}</button>`;
  identity.querySelector('div').append(left.querySelector('.hero-heading'), left.querySelector('.soul-name'));
  title.after(identity);
  left.querySelector('.soul-name').textContent = 'Võ Hồn: ' + hero.soul;
  for(const branch of left.querySelectorAll('[data-branch]')) {
    const index = +branch.dataset.branch;
    branch.innerHTML = `${branchArt(loadout.hero,index)}<span>${escapeText(hero.branches[index])}</span>`;
    branch.setAttribute('aria-pressed', String(index === loadout.branch));
  }
  const supports = document.createElement('section'); supports.className = 'quick-supports';
  supports.innerHTML = `<div class="section-label">TRỢ PHẨM <button data-lobby-action="supports">THAY ĐỔI ›</button></div><div class="quick-slot-row">${Array.from({length:3},(_,i) => {
    const s = loadout.supports[i];
    return `<button data-lobby-action="supports">${s ? supportArt(s.id) : '<span class="empty-slot">＋</span>'}<span>${s ? escapeText(SUPPORTS[s.id-1].name) : 'Khe trống'}</span></button>`;
  }).join('')}</div>`;
  left.append(supports);
  const skills = document.createElement('section'); skills.className = 'lobby-skills';
  skills.innerHTML = `<div class="section-label">KỸ NĂNG VÕ HỒN</div>${SKILLS[loadout.hero].map((s,i) => `<article><img class="item-art" src="${skillIcon(loadout.hero,i)}" alt="${escapeText(s.name)}"><div><strong>${['Q','W','E','R'][i]} · ${escapeText(s.name)}</strong><small>Hồi ${s.cd}s · Hồn lực ${s.mp} · Tầm ${s.range}m</small></div></article>`).join('')}`;
  if(lobbyState.view==='heroes'){
    left.insertBefore(skills,left.querySelector('.hero-stats'));
    identity.classList.add('hero-detail-title');
  }else left.append(skills);
  inventory.classList.add('lobby-panel');
  inventory.querySelector('h2').innerHTML = 'HÀNH TRANG <button data-lobby-view="home" aria-label="Đóng Hành trang">✕</button>';
  for(const id of ['skin','costume']) inventory.querySelector('#'+id).dataset.heroIndex = loadout.hero;
  const stage = hub.querySelector('.stage-label');
  stage.querySelector('p')?.remove(); stage.querySelector(':scope > small')?.remove();
  const stageName = document.createElement('div'); stageName.className = 'stage-hero-name';
  stageName.innerHTML = `<span>${escapeText(hero.soul)}</span><strong>${escapeText(hero.name)}</strong>`;
  stage.prepend(stageName);
  // Keep source/animation comparison available under systems, away from the character's feet.
  const motion = stage.querySelector('#showcaseMotion');
  const footer = hub.querySelector('.hub-footer');
  const tools = footer.querySelector('.footer-links'); tools.classList.add('lobby-tools','lobby-panel');
  const modes = footer.querySelector('.mode-controls');
  const start = footer.querySelector('#start');
  const modePicker = document.createElement('button'); modePicker.className = 'mode-picker'; modePicker.id = 'openModes';
  modePicker.innerHTML = `<small>THƯƠNG MANG CỔ VỰC · ${loadout.ranked ? 'XẾP HẠNG MÔ PHỎNG' : 'ĐẤU THƯỜNG'}</small><strong>${({solo:'SOLO · 100',duo:'DUO · 50 × 2',squad3:'SQUAD · 32 × 3',squad4:'SQUAD · 25 × 4'})[loadout.mode]} <span>⌃</span></strong>`;
  const modePopover = document.createElement('div'); modePopover.className = 'mode-popover lobby-panel'; modePopover.hidden = true; modePopover.append(modes);
  const dock = document.createElement('section'); dock.className = 'battle-dock';
  dock.innerHTML = '<button class="quick-character" id="quickCharacter" data-lobby-view="character" aria-label="Mở Nhân vật"><span>▣</span><small>NHÂN VẬT</small></button><div class="battle-actions"></div>';
  dock.querySelector('.battle-actions').append(modePicker,start);
  dock.append(modePopover); hub.append(dock);
  modePicker.onclick = () => { modePopover.hidden = !modePopover.hidden; modePicker.setAttribute('aria-expanded',String(!modePopover.hidden)); };
  modePicker.setAttribute('aria-expanded','false');
  footer.replaceChildren(); footer.classList.add('lobby-bottom-nav');
  footer.innerHTML = `<button data-lobby-action="stash">KHO HỒN THÀNH</button><button data-lobby-action="weapon-inventory">HỒN KHÍ</button><button data-lobby-view="inventory">HÀNH TRANG</button><button data-lobby-view="systems">THIÊN ĐẠO</button>`;
  hub.append(tools); if(motion) tools.append(motion);
  const cameraControls = stage.querySelector('.showcase-controls');
  tools.append(cameraControls);
  hub.append(stage.querySelector('#showcaseDrag'));
  stage.remove();
  const events = document.createElement('nav'); events.className = 'lobby-events'; events.setAttribute('aria-label','Hoạt động Hồn Thành');
  events.innerHTML = `<div class="lobby-wordmark">HỒN GIỚI<small>SINH TỒN · V2.5</small></div>${iconButton('shop','','SHOP')}${iconButton('fortune','','VQMM')}${iconButton('pass','','HỒN LỆNH')}${iconButton('quests','','NHIỆM VỤ')}${iconButton('events','','SỰ KIỆN')}`;
  hub.append(events);
  const social = document.createElement('nav'); social.className = 'lobby-social'; social.setAttribute('aria-label','Kết nối');
  social.innerHTML = iconButton('chat',lobbyIcon('friends'),'Trò chuyện') + iconButton('clan',lobbyIcon('clan'),'Bang Hội') + iconButton('friends',lobbyIcon('friends'),'Bạn bè') + iconButton('mail',lobbyIcon('history'),'Thư') + iconButton('history',lobbyIcon('rank'),'Vinh danh');hub.append(social);
  const confirm=document.createElement('button');confirm.className='hero-confirm';confirm.dataset.lobbyView='character';confirm.textContent='CHỌN';hub.append(confirm);
  const back = document.createElement('button'); back.className = 'lobby-back'; back.dataset.lobbyView = 'home'; back.textContent = '‹  VỀ SẢNH';hub.append(back);
  hub.querySelectorAll('[data-lobby-view]').forEach(button => button.onclick = () => { lobbyState.view = button.dataset.lobbyView; action('render'); });
  hub.querySelectorAll('[data-lobby-action]').forEach(button => button.onclick = () => action(button.dataset.lobbyAction));
  cardPickers(hub);
}


const balanceChips = profile => `<div class="screen-balances"><span>✦ Ngân Bảo <b>${Number(profile.nb??0).toLocaleString('vi-VN')}</b></span><span>◈ Thanh Bảo <b>${Number(profile.tb??0).toLocaleString('vi-VN')}</b></span></div>`;
export function profilePanel(profile, hero, tab = 'CÁ NHÂN') {
  const tabs=['CÁ NHÂN','TỔNG QUAN','LỊCH SỬ','ĐIỂM UY TÍN','DANH SÁCH MONG MUỐN'];
  const records=profile.record??[], seasons=profile.seasons??[];
  const overview=`<div class="profile-card-brand"><b>HỒN GIỚI</b><span>${escapeText(profile.guild??'CHƯA CÓ BANG HỘI')}</span></div><div class="profile-identity">${portrait(hero)}<div><h3>${escapeText(profile.displayName??profile.username??'Hồn Sư lữ hành')}</h3><p>Tiếng Việt</p><span class="profile-account-icons">◇　☾　◎</span></div><small class="profile-level">Lv.${profile.level??'—'}</small><small class="profile-uid">UID: ${escapeText(profile.uid??'Chưa đăng nhập')}</small></div><p class="profile-mode">⇄ SINH TỒN — THƯƠNG MANG CỔ VỰC</p><div class="profile-badges"><article>${lobbyIcon('rank')}<strong>${escapeText(profile.rank??'Chưa xếp hạng')}</strong><small>Cấp Bậc Tông Sư</small></article><article>${lobbyIcon('seal')}<strong>${escapeText(profile.masterMarks??'Chưa ghi nhận')}</strong><small>Dấu Ấn Tông Sư</small></article><article>${lobbyIcon('style')}<strong>${escapeText(({mage:'Khống chế',fighter:'Cường công',marksman:'Mẫn công',support:'Phụ trợ',tank:'Phòng ngự'})[HEROES[hero].role]??HEROES[hero].element)}</strong><small>Phong Cách Chiến Đấu</small></article></div><h3 class="profile-season-title">◇ HỒN LỆNH</h3><div class="season-badges">${seasons.length?seasons.map(season=>`<span class="${season.vip?'vip':'free'}">${lobbyIcon('seal')}<small>${escapeText(season.name)} · Lv.${Number(season.level)||0}</small></span>`).join(''):`<p class="profile-empty-seasons">Chưa có huy hiệu mùa giải</p>`}</div><div class="profile-signature">${escapeText(profile.bio??'Hồn Giới là số 1')}</div><div class="profile-achievements"><span>Dấu ấn</span>${lobbyIcon('seal')}${lobbyIcon('rank')}${lobbyIcon('style')}</div>`;
  const detail=tab==='LỊCH SỬ'?`<h3>LỊCH SỬ CHIẾN ĐẤU</h3>${records.length?records.slice(0,10).map(r=>`<article class="history-entry"><b>${escapeText(r.title??r.type??'Trận đấu')}</b><small>${Number(r.kills)||0} hạ gục</small></article>`).join(''):'<p>Chưa có trận đấu được ghi nhận.</p>'}`:tab==='ĐIỂM UY TÍN'?'<h3>ĐIỂM UY TÍN</h3><p>Chưa có điểm uy tín được ghi nhận.</p>':'<h3>DANH SÁCH MONG MUỐN</h3><p>Danh sách đang trống.</p>';
  return `<div class="profile-layout fullscreen-lobby-view">${balanceChips(profile)}<h2 class="fullscreen-title">HỒ SƠ</h2><nav class="profile-navigation">${tabs.map(t=>`<button data-profile-tab="${t}" class="${t===tab?'active':''}">${t}</button>`).join('')}</nav><section class="profile-card">${tab==='CÁ NHÂN'||tab==='TỔNG QUAN'?overview:`<div class="profile-tab-content">${detail}</div>`}</section><div class="profile-tools"><button data-lobby-action="profile-camera" aria-label="Ảnh hồ sơ">${lobbyIcon('camera')}</button><button data-lobby-action="friends" aria-label="Bạn bè">${lobbyIcon('friends')}</button><button data-lobby-action="profile-code" aria-label="Mã hồ sơ">${lobbyIcon('qr')}</button><button data-lobby-action="profile-share" aria-label="Chia sẻ hồ sơ">${lobbyIcon('share')}</button></div></div>`;
}
export function friendsPanel(tab='Bạn bè tổng') {
  return `<div class="social-tabs">${['Bạn bè tổng','Bang Hội','Trận trước'].map((t,i)=>`<button data-social-tab="${t}" aria-label="${t}" title="${t}" class="${t===tab?'active':''}">${lobbyIcon(['friends','clan','history'][i])}<span class="sr-only">${t}</span></button>`).join('')}</div><div class="social-toolbar"><button id="friendFilter" aria-pressed="true">Online ⌄</button><button id="friendReload" aria-label="Tải lại bạn bè">${lobbyIcon('reload')}</button><button id="openFriendSearch" aria-label="Tìm bạn bè">${lobbyIcon('search')}</button><button id="teamCode">${lobbyIcon('flag')} TEAMCODE</button></div><input id="friendSearch" aria-label="Tìm bạn bè" placeholder="Tên Hồn Sư" hidden><div class="friends-empty-frame"><p id="friendsStatus">Danh sách ${escapeText(tab.toLowerCase())} đang trống.</p><small>Kết nối cùng Hồn Sư khi tính năng mở.</small></div>`;
}
export function passPanel(profile) {
  const season=profile.currentSeason;
  const names=[['Thanh Bảo','Hồn Hoàn','Hồn Khí','Trang phục'],['Ngân Bảo','Linh phù','Hồn Cốt','Hồn Hoàn']];
  return `<div class="pass-layout fullscreen-lobby-view">${balanceChips(profile)}<div class="pass-sigil">令<small>HỒN LỆNH</small></div><header class="pass-heading"><span>HỒN GIỚI</span><h3>${escapeText(season?.name??'THANH MỘC LINH LỆNH')}</h3><div class="pass-progress"><strong>${season?'Lv.'+Number(season.level??0):'SẮP MỞ'}</strong><div class="pass-xp"><span style="width:${season?Math.min(100,Math.max(0,Number(season.progress)||0)):0}%"></span><small>${season?'EXP '+Number(season.progress??0)+'/100':'Chưa có mùa giải đang mở'}</small></div></div></header><div class="pass-label">HỒN LỆNH</div><div class="pass-track">${['PHÀM PHẨM','THƯỢNG PHẨM'].map((name,row)=>`<section class="${row?'vip':'free'}"><h4>${lobbyIcon('seal')}<span>${name}</span><small>${row?'VIP':'FREE'}</small></h4><div class="pass-rewards">${[85,86,87,88].map((level,col)=>`<button disabled><small class="pass-level">Lv.${level}</small><span class="pass-reward-art" style="--reward-x:${[212,326,444,562][col]};--reward-y:${row?454:290}"></span><strong>${names[row][col]}</strong><small>Chưa mở</small>${row?'<i>▣</i>':''}</button>`).join('')}</div></section>`).join('')}<div class="pass-milestone" role="img" aria-label="Xem trước mốc Hồn Lệnh cấp 90"><span>Xem trước · Chưa mở</span></div></div><button class="pass-unlock" disabled>MỞ KHÓA</button><nav class="pass-links"><button data-lobby-action="quests">${lobbyIcon('seal')}<span>NHIỆM VỤ</span></button><button data-lobby-action="profile">${lobbyIcon('history')}<span>LỊCH SỬ</span></button></nav><div class="pass-perks"><strong>ĐẶC QUYỀN HỒN LỆNH</strong><div>${lobbyIcon('seal')}${lobbyIcon('rank')}${lobbyIcon('style')}${lobbyIcon('flag')}</div><small>Chưa kích hoạt</small></div></div>`;
}
export function questPanel(period='daily',week=1,profile={}) {
  const examples=['[THƯƠNG MANG XẾP HẠNG] Hạ gục hoặc hỗ trợ 1 lần','Đăng nhập vào Hồn Giới','Tích lũy Hồi Hoàn thành công 3 lần','Gây 5000 sát thương bằng Võ Hồn','Tích lũy chơi trong Hồn Giới 30 phút','Tích lũy chơi trong Hồn Giới 40 phút'];
  const quests=profile.quests?.filter(q=>q.period===period)??[];
  const rows=quests.length?quests:examples.map(title=>({title,preview:true}));
  return `<div class="quest-layout fullscreen-lobby-view">${balanceChips(profile)}<header class="quest-screen-tabs"><button class="active">THỬ THÁCH</button><button data-lobby-action="pass">MỤC TIÊU MÙA GIẢI</button></header><nav class="quest-navigation"><button data-quest-period="daily" class="${period==='daily'?'active':''}">HÀNG NGÀY <small>EXP ↑</small></button><button data-quest-period="weekly" class="${period==='weekly'?'active':''}">HÀNG TUẦN <span>⌃</span></button><div class="quest-weeks">${[1,2,3,4].map(n=>`<button data-quest-week="${n}" class="${period==='weekly'&&n===week?'active':''}">TUẦN ${n}</button>`).join('')}</div></nav><section class="quest-showcase"><header><h3>NHIỆM VỤ ${period==='daily'?'HÀNG NGÀY':'HÀNG TUẦN'}</h3><small>${quests.length?'Thử thách đang mở':'Xem trước · Chưa có nhiệm vụ được giao'}</small></header><div class="quest-weapon-preview" role="img" aria-label="Minh họa Mộc Tinh Trượng trong mẫu phần thưởng"></div><button class="daily-reward" disabled><span>THƯỞNG ${period==='daily'?'HÀNG NGÀY':'TUẦN '+week}</span><small>CHƯA MỞ</small></button></section><section class="quest-list">${rows.map(q=>`<article class="quest-entry ${q.preview?'preview':''}"><h4>${escapeText(q.title)}</h4><div class="quest-entry-bottom"><div class="quest-reward-icons">${itemIcon('item',1,{label:'Minh họa phần thưởng'})}${itemIcon('support',1,{label:'Minh họa kinh nghiệm'})}</div><button disabled>${q.preview?'CHƯA MỞ':q.claimed?'ĐÃ NHẬN':`${Number(q.progress)||0}/${Number(q.target)||1}`}</button></div></article>`).join('')}</section><div class="quest-rank" role="img" aria-label="Trang trí thử thách Hồn Thành"><span>${profile.currentSeason?'Lv.'+Number(profile.currentSeason.level??0):'CHƯA MỞ'}</span></div></div>`;
}
