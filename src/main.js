import "./style.css";
import {
  HEROES,
  SKILLS,
  ITEMS,
  RECIPES,
  SUPPORTS,
  RINGS,
  BONES,
  REGIONS,
  GATE_POS,
  COSTUMES,
  WEAPONS,
  BRANCH_TEXT,
} from "./data.js";
import * as R from "./rules.js";
import { Match } from "./simulation.js";
import { quickOffers, contextualActions } from "./hud.js";
import { MAP_BUSHES } from "./systems.js";
import { itemIcon, skillIcon, masterworkAssets } from "./item-art.js";
import { ensureRuntimeSecurity, securityFacade } from "./runtime-security.js";
import{persistOfflineSave,clearOfflineSave}from'./offline-session.js';
import { GameLifecycleStateMachine, PHASES } from './game-lifecycle.js';
import { nextPaint, waitForUiPaint, observeBoot } from './runtime-performance.js';
const lifecycle=new GameLifecycleStateMachine();
const bootMetrics=observeBoot();bootMetrics.sourceHash=import.meta.env.HG_BUILD_ID??'development';
import { SoulAudio } from "./audio.js";
import {
  SmoothSkillshotController,
  screenVectorToWorld,
} from "./smooth-skillshot.js";
import { AutoFarmAIController } from "./auto-farm.js";
const audio = new SoulAudio();
window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
window.addEventListener("keydown", () => audio.unlock(), { once: true });
import { api, RemoteMatch, configureServer, serverOrigin } from "./network.js";
const $ = (q, root = document) => root.querySelector(q),
  $$ = (q, root = document) => [...root.querySelectorAll(q)];
const money = (n) => Number(n.toFixed(1)).toLocaleString("vi-VN");
const clock = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const app = $("#app");
let profile;
let pendingSnapshot = null;
let pendingRun=null;
let onlineAccount = false;
try {
  const saved = JSON.parse(localStorage.getItem("hon-gioi-save-v2"));
  profile = saved?.profile ?? JSON.parse(localStorage.getItem("hon-gioi-v25"));
  pendingSnapshot = saved?.match ?? null;
  pendingRun=saved?.activeRun??null;
  if (profile?.version !== 1) profile = null;
} catch {}
if (!profile) {
  profile = R.newProfile();
  profile.stash = [
    ...RINGS.map((i) => R.loot("ring", i.id)),
    ...BONES.map((i) => R.loot("bone", i.id)),
  ];
}
profile.eventTickets ??= 1;
const save = () => {
  if(onlineAccount)return true;
  try{
    const active=match&&!match.online&&!match.result;
    const snapshot=active?match.snapshot():match?.result?null:pendingSnapshot;
    const receipt=active||match?.result?null:pendingRun;
    const result=persistOfflineSave(localStorage,profile,{snapshot,receipt});
    bootMetrics.persistenceError=null;bootMetrics.mirrorError=result.mirrorError;return true;
  }catch(error){bootMetrics.persistenceError=error.message;toast('Chưa lưu được trạng thái trận. Không đóng ứng dụng; hãy thử lại.');return false;}
};
let loadout = {
  hero: 0,
  branch: 0,
  rings: [1, 3],
  bones: [1, 2],
  supports: [
    { id: 17, tier: 1 },
    { id: 18, tier: 1 },
    { id: 5, tier: 1 },
  ],
  skin: 0,
  costume: 0,
  mode: "solo",
  ranked: false,
  brought: 200,
  companion: true,
};
let match = null,
  modal = null,
  paused = false,
  world;
const input = { x: 0, z: 0, attack: false, targetMode: "auto" },
  keys = new Set();
let toastTimer;
let appraisalTimer = null;
let releaseJoystick = () => {};
function updateAssetLoadingIndicator(){
 const el=document.getElementById('assetLoadStatus');if(!el)return;
 const asset=world?.previewAsset??world?.preview?.getObjectByName(loadout.hero===1?'manualHero_H02_C0':'manualHero_H01_C0')?.userData.manualAsset;
 const expected=loadout.hero===1?'H02-C0':'H01-C0';const visible=asset?.id===expected&&asset.status==='loaded'&&(asset.entrance?.visible!==false)&&(asset.entrance?.heroVisible!==false);
 const hidden=!!match||![0,1].includes(loadout.hero)||loadout.costume!==0||visible;if(el.hidden!==hidden)el.hidden=hidden;
 const text=asset?.status==='failed'?`Không nạp được model — chạm ${loadout.hero===1?'Trạch':'Dật'} để thử lại.`:(loadout.hero===1?'Đang nạp Hàn Trạch và Chấn Nhạc Chùy…':'Đang nạp Lâm Dật và Mộc Tinh Trượng…');
 if(el.textContent!==text)el.textContent=text;
}
const lootArt = (item, className = "item-art") =>
  itemIcon(item.kind, item.id ?? 1, { className, label: item.name });
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2200);
}
function guarded(fn) {
  try {
    const result=fn();
    return result?.catch ? result.catch(e=>{toast(e.message);return false;}) : result;
  } catch (e) {
    toast(e.message);
    return false;
  }
}
let worldReady;
async function initializeWorld(options={}){
 await waitForUiPaint();
 const {createRenderEngine}=await import('./render-engine.js');
 await nextPaint();
 world=await createRenderEngine($('#world'),options);
 bootMetrics.marks.worldReady=performance.now();
 return world;
}
const autoInput = { x: 0, z: 0, attack: false, targetMode: "auto" };
const autoFarm = new AutoFarmAIController({
  getMatch: () => match,
  now: () => performance.now() / 1000,
  notify: (message) => toast(message),
  actions: {
    move: (value) => Object.assign(autoInput, value),
    cast: (slot, aim) => guarded(() => match?.cast(match.player, slot, aim)),
    pickup: () => guarded(() => match?.pickup()),
    pickupSelected: (uid) => guarded(() => match?.pickupSelected(uid)),
    shop: (action, id) => guarded(() => match?.shop(action, id)),
    equipRing: (uid, slot) => guarded(() => match?.equipRing(uid, slot)),
    extract: (mode, selected) =>
      guarded(() => match?.beginExtraction(mode, selected)),
    portal: () => guarded(() => match?.usePortal()),
  },
});
try {
  autoFarm.setConfig(
    JSON.parse(localStorage.getItem("hon-gioi-auto-config-v25") || "{}"),
  );
} catch {}
const skillshot = new SmoothSkillshotController({
  getMatch: () => match,
  getSkill: (k) =>
    k === 4
      ? { shape: "line", range: 2.8, radius: 0.6, mp: 0, headingOnly: true }
      : R.skillFor(match.player, k),
  cast: (slot, aim) => guarded(() => match.cast(match.player, slot, aim)),
  getAzimuth: () =>
    Math.atan2(
      world.camera.position.x - world.focus.x,
      world.camera.position.z - world.focus.z,
    ),
  getMovement: () => controlInput(),
  getTargetMode: () => input.targetMode,
  getCancelCenter: () => {
    const r = $("#cancelSkill")?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  },
  onAim: (...args) => world.aim(...args),
  onClear: () => world?.clearAim(),
  onManualStart: (id) => {
    autoFarm.manualStart(id);
    Object.assign(autoInput, { x: 0, z: 0, attack: false });
    pushInputEdge();
  },
  onManualEnd: (id) => autoFarm.manualEnd(id),
  onUI: ({ slot, held, knob, canceled }) => {
    const button = $(`[data-skill="${slot}"]`),
      cancel = $("#cancelSkill");
    if (!button || !cancel) return;
    button.classList.toggle("aim-held", held);
    const thumb = $(".skill-thumb-knob", button);
    if (thumb) thumb.style.transform = `translate(${knob.x}px,${knob.y}px)`;
    cancel.classList.toggle("hidden", !held);
    cancel.classList.toggle("armed", canceled);
  },
});
function showAutoSettings() {
  const labels = {
    useSkills: "Tự dùng Q / W / E · giữ 25% Hồn lực",
    allowUltimate: "Cho dùng R lên Boss / Tinh anh (chỉ Toàn diện)",
    autoLoot: "Nhặt & thẩm định chiến lợi phẩm",
    autoBuild: "Mua & ghép preset 7 Bổ phẩm",
    kiting: "Thả diều và giữ tầm đánh",
    avoidDanger: "Né Hồn Chướng và vùng kỹ năng nguy hiểm",
  };
  const status = autoFarm.status();
  showModal(
    "Ủy Thác Chiến Trường",
    `<p class="intro">Chạm joystick hoặc ngắm chiêu để giành quyền ngay; AI chờ 1,2 giây sau khi nhả tay. PvE luôn giữ R / F. Mua/ghép và Hồi Hoàn vẫn tuân luật trận.</p><div class="auto-settings">${Object.entries(
      labels,
    )
      .map(
        ([key, label]) =>
          `<label><input type="checkbox" data-auto-setting="${key}" ${status.config[key] ? "checked" : ""}><span>${label}</span></label>`,
      )
      .join(
        "",
      )}</div><p class="intro">${status.blockedPresetIds.length ? "Bỏ qua món gây Phản Phệ: " + status.blockedPresetIds.map((i) => ITEMS[i - 1].code).join(", ") : "Preset hiện tại không có món gây Phản Phệ."}</p>`,
    () => {
      $$("[data-auto-setting]").forEach(
        (el) =>
          (el.onchange = () => {
            autoFarm.setConfig({ [el.dataset.autoSetting]: el.checked });
            localStorage.setItem(
              "hon-gioi-auto-config-v25",
              JSON.stringify(autoFarm.status().config),
            );
          }),
      );
    },
  );
}
function updateAutoHUD() {
  const status = autoFarm.status(),
    dock = $("#autoFarmDock"),
    button = $("#autoFarmToggle"),
    label = $("#autoFarmStatus"),
    hint = $("#autoFarmHint");
  if (!dock || !button) return;
  dock.dataset.mode = status.mode;
  const names = { off: "TẮT", pve: "SĂN QUÁI", full: "TOÀN DIỆN" };
  if ($("b", button).textContent !== names[status.mode])
    $("b", button).textContent = names[status.mode];
  button.setAttribute("aria-pressed", String(status.mode !== "off"));
  button.setAttribute("aria-label", "AUTO FARM: " + names[status.mode]);
  const message = status.manualPaused
    ? `Ưu tiên thao tác tay${status.resumeIn ? " · " + status.resumeIn.toFixed(1) + "s" : ""}`
    : status.text;
  if (label.textContent !== message) label.textContent = message;
  if (hint) {
    hint.classList.toggle("hidden", status.mode === "off");
    if (hint.textContent !== status.manualHint)
      hint.textContent = status.manualHint;
    if (status.mode !== "off" && match?.player) {
      const point = world.actorScreenPosition(match.player, 2.0);
      hint.style.left = point.x + "px";
      hint.style.top = point.y + "px";
    }
  }
}
function ownsGear(kind, id) {
  return profile.stash.some((i) => i.kind === kind && i.id === id);
}
function renderHub() {
  const h = HEROES[loadout.hero];
  const stats = R.stats({ ...loadout, items: [] });
  const selectedGear = [
    ...loadout.rings
      .filter(Boolean)
      .map((id) => profile.stash.find((i) => i.kind === "ring" && i.id === id)),
    ...loadout.bones.map((id) =>
      profile.stash.find((i) => i.kind === "bone" && i.id === id),
    ),
  ];
  const risk = selectedGear.reduce(
    (sum, item) => sum + (item?.value ?? 0),
    loadout.brought,
  );
  app.innerHTML = `<main class="hub"><header class="row between"><div class="brand"><div class="sigil"><span>魂</span></div><div><div class="brand-title">HỒN GIỚI</div><div class="brand-sub">SINH TỒN · THƯƠNG MANG CỔ VỰC</div></div></div><div class="wallet"><span>✦ Ngân Bảo <b>${money(profile.nb)}</b></span><span>◈ Thanh Bảo <b>${money(profile.tb)}</b></span><button class="ghost" id="fullscreen" aria-label="Toàn màn hình">⛶</button></div></header>
 <section class="hub-main"><div class="left-info"><div class="eyebrow">HỒN THÀNH / CHUẨN BỊ XUẤT CHIẾN</div><h1 class="hero-heading">${h.name}</h1><div class="soul-name">${h.soul}</div><small class="risk-value">Tài sản chịu rủi ro: ${money(risk)} TB</small><div class="row"><small>${h.id} · Hệ ${h.element}</small><small>◇ ${h.role === "mage" ? "Pháp công / Khống chế" : h.role === "fighter" ? "Cường công / Đấu sĩ" : h.role === "marksman" ? "Mẫn công / Xạ thủ" : "Phòng ngự / Phụ trợ"}</small></div>
 <div class="hero-stats">${[
   ["HP", h.hp],
   ["Công VL", h.atk],
   ["Hồn công", h.power],
   ["Giáp", h.armor],
   ["Kháng", h.resist],
   ["Tốc chạy", h.speed],
   ["Hồn lực", h.mp],
   ["Tầm đánh", h.range + "m"],
 ]
   .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`)
   .join(
     "",
   )}</div><div class="section-label">NHÁNH TIẾN HÓA <span>KHÓA KHI VÀO TRẬN</span></div><div class="branches">${h.branches.map((n, i) => `<button data-branch="${i}" class="${loadout.branch === i ? "active" : ""}">${n}</button>`).join("")}</div><div class="branch-description" id="branchText"></div><div class="hero-grid">${HEROES.map((h, i) => `<button class="hero-card ${loadout.hero === i ? "active" : ""}" data-hero="${i}" style="--hero:#${h.color.toString(16)}" title="${h.name}">${itemIcon("weapon", i + 1, { label: WEAPONS[i] })}<span class="hero-card-name">${h.name.split(" ").at(-1)}</span></button>`).join("")}</div></div>
 <div class="stage-label"><p>${WEAPONS[loadout.hero].toUpperCase()}</p><small>${[0,1].includes(loadout.hero) && (loadout.costume ?? 0) === 0 ? "HUNYUAN · RIG / HOẠT ẢNH THỬ NGHIỆM" : "MÔ HÌNH 3D"} · ${loadout.skin === 2 ? "VIP" : loadout.skin === 1 ? "CƠ BẢN" : "NGUYÊN BẢN"}</small><div class="showcase-controls"><button id="showcaseFull" aria-label="Xem toàn thân">TOÀN THÂN</button><button id="showcaseFace" aria-label="Xem khuôn mặt">CẬN CẢNH</button></div><div id="showcaseDrag" aria-label="Kéo xoay nhân vật"></div></div>
 <aside class="loadout-panel"><h2 class="panel-title">01 / HÀNH TRANG XUẤT CHIẾN</h2><div class="section-label">HỒN HOÀN <span>2 KHE</span></div><div class="ring-pair">${[
   1, 2,
 ]
   .map(
     (slot) =>
       `<div class="ring-choice">${loadout.rings[slot - 1] ? itemIcon("ring", loadout.rings[slot - 1], { label: RINGS[loadout.rings[slot - 1] - 1].name }) : '<div class="empty-icon"></div>'}<select aria-label="Hồn hoàn khe ${slot}" data-ring="${slot}"><option value="0">Khe ${slot} · Trống</option>${RINGS.filter(
         (r) =>
           R.ringCompatible(loadout.hero, r.id, slot) && ownsGear("ring", r.id),
       )
         .map(
           (r) =>
             `<option value="${r.id}" ${loadout.rings[slot - 1] === r.id ? "selected" : ""}>${r.name}</option>`,
         )
         .join("")}</select></div>`,
   )
   .join(
     "",
   )}</div><div class="section-label">HỒN CỐT <span>6 VỊ TRÍ + NGOẠI PHỤ</span></div><div class="bone-grid">${BONES.map((b) => `<button class="bone ${loadout.bones.includes(b.id) ? "active" : ""}" data-bone="${b.id}" ${!ownsGear("bone", b.id) ? "disabled" : ""} title="${b.name}">${itemIcon("bone", b.id, { label: b.name })}${b.slot}</button>`).join("")}</div><div class="section-label">HỒN KHÍ & TRANG PHỤC <span>THẨM MỸ</span></div><div class="ring-pair"><select id="skin" aria-label="Skin Hồn khí">${["Nguyên bản", "Cơ bản · 2.800 TB", "VIP · 399 NB"].map((s, i) => `<option value="${i}" ${loadout.skin === i ? "selected" : ""}>${s}</option>`).join("")}</select><select id="costume" aria-label="Trang phục">${COSTUMES[loadout.hero].map((s, i) => `<option value="${i}" ${loadout.costume === i ? "selected" : ""}>${s}${i === 1 ? " · 1.800 TB" : i === 2 ? " · 299 NB" : i === 3 ? " · 1 Vé" : ""}</option>`).join("")}</select></div><div class="weapon-previews">${[0, 1, 2].map((skin) => `<button data-preview-skin="${skin}" class="${loadout.skin === skin ? "active" : ""}" aria-label="Xem ${["Nguyên bản", "Cơ bản", "VIP"][skin]}">${itemIcon("weapon", loadout.hero + 1, { skin, label: ["Nguyên bản", "Cơ bản", "VIP"][skin] })}<span>${["GỐC", "CƠ BẢN", "VIP"][skin]}</span></button>`).join("")}</div><div class="section-label">PHẨM KHO <button id="openSupports" class="ghost small">THAY ĐỔI ↗</button></div><div class="stack">${loadout.supports.map((s, i) => `<div class="support-slot">${itemIcon("support", s.id, { label: SUPPORTS[s.id - 1].name })}<span>${i + 1} / ${SUPPORTS[s.id - 1].name}</span><small>Cấp ${s.tier}</small></div>`).join("")}${loadout.supports.length < 3 ? "<small>Chưa chọn đủ 3 khe — không bắt buộc</small>" : ""}</div><div class="section-label">VỐN MANG VÀO <span id="capitalValue">${loadout.brought} / 300 TB</span></div><input id="capital" type="range" min="0" max="${Math.min(300, profile.tb)}" step="10" value="${loadout.brought}" aria-label="Vốn Thanh bảo mang vào"><small>Tiêu trước thu nhập trận · Chết hoàn 50% phần dư</small></aside></section>
 <footer class="hub-footer"><div><div class="mode-controls">${[
   ["solo", "SOLO · 100"],
   ["duo", "DUO · 50 × 2"],
   ["squad3", "SQUAD · 32 × 3"],
   ["squad4", "SQUAD · 25 × 4"],
 ]
   .map(
     ([id, n]) =>
       `<button data-mode="${id}" class="${loadout.mode === id ? "active" : ""}">${n}</button>`,
   )
   .join(
     "",
   )}<button id="ranked" class="${loadout.ranked ? "active" : ""}">${loadout.ranked ? "XẾP HẠNG · MÔ PHỎNG" : "ĐẤU THƯỜNG"}</button></div><div class="version">${onlineAccount ? "V2.5 / ONLINE · VÍ VÀ KHO DO MÁY CHỦ QUẢN LÝ" : "V2.5 / NGOẠI TUYẾN VỚI BOT · LƯU TRÊN THIẾT BỊ"} · BẢN ${bootMetrics.sourceHash.slice(0,8)}</div><div class="footer-links"><button class="ghost" id="stash">KHO HỒN THÀNH (${profile.stash.length})</button><button class="ghost" id="help">HƯỚNG DẪN</button><button class="ghost" id="history">ĐÀI VINH DANH</button></div></div><div><button class="primary start-button" id="start">BẮT ĐẦU TRẬN ĐẤU ↗<small>${loadout.mode === "squad3" ? "96" : "100"} HỒN SƯ · ${loadout.ranked ? "CHUẨN HÓA SKIN" : "THƯƠNG MANG CỔ VỰC"}</small></button><div class="version" style="text-align:right">CHI PHÍ TRỢ PHẨM: ${supportCost()} NB + ${supportTbCost()}TB</div></div></footer></main><section class="offline-resume-actions" aria-label="Trận ngoại tuyến đang dở">${!onlineAccount&&pendingSnapshot?'<button class="ghost" id="resumeOffline">TIẾP TỤC TRẬN</button>':''}${!onlineAccount&&(pendingSnapshot||pendingRun)?'<button class="ghost" id="abandonOffline">XỬ LÝ TRẬN DỞ</button>':''}</section><div id="modalRoot"></div>`;
  $("#branchText").textContent = BRANCH_TEXT[loadout.hero][loadout.branch];
  $$("[data-hero]").forEach(
    (el) =>
      (el.onclick = () => {
        if([0,1].includes(+el.dataset.hero)&&+el.dataset.hero===loadout.hero)world?.replayHeroEntrance();
        loadout.hero = +el.dataset.hero;
        loadout.branch = 0;
        loadout.skin = 0;
        loadout.costume = 0;
        loadout.rings = [1, 2].map(
          (slot) =>
            RINGS.find(
              (r) =>
                R.ringCompatible(loadout.hero, r.id, slot) &&
                ownsGear("ring", r.id),
            )?.id ?? 0,
        );
        renderHub();
      }),
  );
  $$("[data-branch]").forEach(
    (el) =>
      (el.onclick = () => {
        loadout.branch = +el.dataset.branch;
        renderHub();
      }),
  );
  $$("[data-ring]").forEach(
    (el) =>
      (el.onchange = () => {
        loadout.rings[+el.dataset.ring - 1] = +el.value;
        renderHub();
      }),
  );
  $$("[data-bone]").forEach(
    (el) =>
      (el.onclick = () => {
        let id = +el.dataset.bone;
        loadout.bones = loadout.bones.includes(id)
          ? loadout.bones.filter((i) => i !== id)
          : [...loadout.bones, id];
        renderHub();
      }),
  );
  $("#capital").oninput = (e) => {
    loadout.brought = +e.target.value;
    $("#capitalValue").textContent = loadout.brought + " / 300 TB";
  };
  for (const [selector, field] of [
    ["#skin", "skin"],
    ["#costume", "costume"],
  ])
    $(selector).onchange = async (e) => {
      const id = +e.target.value;
      try {
        await purchaseCosmetic(field, id);
        loadout[field] = id;
      } catch (e) {
        toast(e.message);
      }
      renderHub();
    };
  $$("[data-mode]").forEach(
    (el) =>
      (el.onclick = () => {
        loadout.mode = el.dataset.mode;
        renderHub();
      }),
  );
  $("#ranked").onclick = () => {
    loadout.ranked = !loadout.ranked;
    renderHub();
    if (loadout.ranked)
      toast(
        "Simulation locale: VIP chuẩn hóa về Cơ Bản. Không phải ghép trận xếp hạng trực tuyến.",
      );
  };
  $$("[data-preview-skin]").forEach(
    (el) =>
      (el.onclick = () => {
        const select = $("#skin");
        select.value = el.dataset.previewSkin;
        select.dispatchEvent(new Event("change"));
      }),
  );
  $("#openSupports").onclick = () => showSupports();
  $("#stash").onclick = showStash;
  $("#help").onclick = showHelp;
  $("#history").onclick = showHistory;
  $("#start").onclick = (event) => guarded(()=>startMatch(event));
  if($('#resumeOffline'))$('#resumeOffline').onclick=event=>guarded(()=>continueOfflineMatch(event));
  if($('#abandonOffline'))$('#abandonOffline').onclick=()=>showInterruptedRunConfirmation();
  $("#fullscreen").onclick = fullscreen;
  $("#showcaseFull").onclick = () => world?.setShowcaseView("full");
  $("#showcaseFace").onclick = () => world?.setShowcaseView("face");
  const drag = $("#showcaseDrag");
  let dragX = null;
  drag.onpointerdown = (event) => {
    dragX = event.clientX;
    drag.setPointerCapture(event.pointerId);
  };
  drag.onpointermove = (event) => {
    if (dragX !== null) {
      world?.rotateShowcase((event.clientX - dragX) * 0.009);
      dragX = event.clientX;
    }
  };
  drag.onpointerup = drag.onpointercancel = () => {
    dragX = null;
  };
  const safety = document.createElement("button");
  safety.id = "securityShield";
  safety.className = "ghost";
  safety.textContent = "THIÊN ĐẠO HỘ GIỚI";
  safety.onclick = showSecurity;
  $(".footer-links").append(safety);
  const perfButton=document.createElement('button');perfButton.className='ghost';perfButton.id='perfDebug';perfButton.textContent='ĐO HIỆU NĂNG';perfButton.onclick=showPerfDiagnostics;$('.footer-links').append(perfButton);
  const soundButton = document.createElement("button");
  soundButton.className = "ghost";
  soundButton.textContent = audio.enabled ? "ÂM THANH: BẬT" : "ÂM THANH: TẮT";
  soundButton.onclick = () => {
    audio.unlock();
    audio.toggle();
    renderHub();
  };
  $(".footer-links").append(soundButton);
  const petToggle = document.createElement("button");
  petToggle.className = "ghost";
  petToggle.textContent = loadout.companion
    ? "HỒN LINH: ĐỒNG HÀNH"
    : "HỒN LINH: NGHỈ";
  petToggle.onclick = () => {
    loadout.companion = !loadout.companion;
    renderHub();
  };
  $(".footer-links").append(petToggle);
  const onlineButton = document.createElement("button");
  onlineButton.className = "ghost";
  onlineButton.id = "onlineAccount";
  onlineButton.textContent = onlineAccount
    ? "TÀI KHOẢN ONLINE"
    : "ĐĂNG NHẬP ONLINE";
  onlineButton.onclick = showOnline;
  $(".footer-links").append(onlineButton);
}
function supportTbCost() {
  return loadout.supports.reduce(
    (n, s) => n + (s.currency === "tb" ? SUPPORTS[s.id - 1].tb : 0),
    0,
  );
}
function supportCost() {
  return loadout.supports.reduce(
    (n, s) =>
      n + (s.currency === "tb" ? 0 : SUPPORTS[s.id - 1].prices[s.tier - 1]),
    0,
  );
}
function purchaseCosmetic(kind, id) {
  if (onlineAccount)
    return api("/shop", {
      kind: "cosmetic",
      type: kind,
      id,
      hero: loadout.hero,
    }).then(async () => {
      profile = (await api("/me")).profile;
    });
  if (!id) return;
  const key = `${kind}-${loadout.hero}-${id}`;
  if (profile.owned.includes(key)) return;
  if (id === 3) {
    if (kind !== "costume" || profile.eventTickets < 1)
      throw Error("Cần1Vé Sự Kiện");
    profile.eventTickets--;
    profile.owned.push(key);
    save();
    return;
  }
  const premium = id === 2,
    price = kind === "skin" ? (premium ? 399 : 2800) : premium ? 299 : 1800,
    wallet = premium ? "nb" : "tb";
  if (profile[wallet] < price) throw Error("Không đủ tiền trong ví Hồn Thành");
  profile[wallet] -= price;
  profile.owned.push(key);
  save();
}
function showModal(title, content, bind = () => {}) {
  releaseJoystick();
  skillshot.reset();
  autoFarm.manualStart("modal");
  input.attack = false;
  input.x = input.z = 0;
  keys.clear();
  modal = title;
  pushInputEdge();
  $("#modalRoot").innerHTML =
    `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${title}"><header class="modal-header"><h2>${title}</h2><button id="closeModal" class="ghost" aria-label="Đóng">✕</button></header>${content}</section></div>`;
  $("#closeModal").onclick = closeModal;
  bind();
}
function closeModal() {
  autoFarm.manualEnd("modal");
  modal = null;
  clearTimeout(appraisalTimer);
  appraisalTimer = null;
  $("#modalRoot").innerHTML = "";
  input.attack = false;
}
function showPerfDiagnostics(){
 const enabled=new URLSearchParams(location.search).get('perf')==='1';
 showModal('Đo hiệu năng',`<p class="intro">${enabled?'Đang ghi số đo.':'Chưa bật ghi số đo.'} Bật đo sẽ tải lại sảnh. Chọn nhân vật hoặc mở cửa hàng/túi đồ, đợi ít nhất 5 giây rồi lấy báo cáo. Số đo này thuộc thiết bị đang chạy.</p><button id="perfToggle">${enabled?'TẮT':'BẬT'} ĐO VÀ TẢI LẠI SẢNH</button><button id="perfCollect">LẤY BÁO CÁO</button><textarea id="perfReport" aria-label="Báo cáo hiệu năng" readonly style="width:100%;height:220px;margin-top:12px"></textarea>`,()=>{
  $('#perfToggle').onclick=()=>{const url=new URL(location.href);if(enabled)url.searchParams.delete('perf');else url.searchParams.set('perf','1');location.href=url.href;};
  $('#perfCollect').onclick=async()=>{
   const target=$('#perfReport');target.value='Đang lấy số đo…';
   try{
    const diagnostic=await world?.inspect?.();
    target.value=JSON.stringify({build:window.__HON_GIOI__.build,enabled,backend:world?.backend,renderer:diagnostic?{render:diagnostic.render,memory:diagnostic.memory}:world?.renderer?.info?{render:world.renderer.info.render,memory:world.renderer.info.memory}:null,perf:diagnostic?.perf??globalThis.__HG_PERF__?.snapshot?.()??null},null,2);
    target.focus();target.select();
   }catch(error){target.value='Không lấy được số đo: '+error.message;}
  };
 });
}
function showSecurity() {
  const security = window.__HON_GIOI__?.security;
  showModal(
    "Thiên Đạo Hộ Giới",
    '<p class="intro">Trạng thái kiểm tra của bản dựng này. Máy chủ xác thực kết quả online; lớp kiểm tra JavaScript cục bộ có giới hạn khi thiết bị bị can thiệp.</p><pre id="securityStatus" class="security-status"></pre><button id="securitySimulate" class="primary">CHẠY KIỂM TRA GIẢ LẬP</button>',
    () => {
      const update = (result) => {
        $("#securityStatus").textContent = JSON.stringify(
          result ??
            security?.status?.() ?? {
              available: false,
              reason: "Chưa có trận đang hoạt động",
            },
          null,
          2,
        );
      };
      update();
      $("#securitySimulate").onclick = async () => {
        try {
          const result = await security?.simulate?.();
          update(result);
        } catch (error) {
          update({ error: error.message });
        }
      };
    },
  );
}
function showSupports() {
  showModal(
    "Phẩm Kho · Ba lá bùa định vận",
    `<p class="intro">Chọn tối đa 3 loại. Trả Ngân Bảo khi xuất chiến. Duy Linh Chú và Bội Linh Chú khóa lẫn nhau. Cấp độ chỉ có ở các món được GDD định nghĩa.</p><div class="catalog">${SUPPORTS.map(
      (s) => {
        const chosen = loadout.supports.find((c) => c.id === s.id),
          conflict =
            (s.id === 1 && loadout.supports.some((c) => c.id === 4)) ||
            (s.id === 4 && loadout.supports.some((c) => c.id === 1));
        return `<div class="item-card support-choice ${chosen ? "selected" : ""}">${itemIcon("support", s.id, { label: s.name })}<small>${s.code}</small><h3>${s.name}</h3><p>${s.text}</p><div class="row between"><select data-tier="${s.id}" aria-label="Cấp ${s.name}">${s.prices.map((p, i) => `<option value="${i + 1}" ${chosen?.tier === i + 1 ? "selected" : ""}>Cấp ${i + 1} · ${p} NB</option>`).join("")}</select>${s.tb ? `<select data-currency="${s.id}" aria-label="Loại tiền ${s.name}"><option value="nb">Ngân Bảo</option><option value="tb" ${chosen?.currency === "tb" ? "selected" : ""}>${s.tb}Thanh Bảo</option></select>` : ""}<button data-support="${s.id}" ${conflict ? "disabled" : ""}>${chosen ? "Bỏ chọn" : conflict ? "Xung đột" : "Chọn"}</button></div></div>`;
      },
    ).join("")}</div>`,
    () => {
      $$("[data-support]").forEach(
        (el) =>
          (el.onclick = () =>
            guarded(() => {
              const id = +el.dataset.support,
                old = loadout.supports.find((s) => s.id === id);
              if (old)
                loadout.supports = loadout.supports.filter((s) => s.id !== id);
              else {
                if (loadout.supports.length >= 3)
                  throw Error("Chỉ được mang tối đa 3 Trợ phẩm");
                loadout.supports.push({
                  id,
                  tier: +$(`[data-tier="${id}"]`).value,
                  currency: $(`[data-currency="${id}"]`)?.value ?? "nb",
                });
              }
              renderHub();
              showSupports();
            })),
      );
      $$("[data-currency]").forEach(
        (el) =>
          (el.onchange = () => {
            const s = loadout.supports.find(
              (s) => s.id === +el.dataset.currency,
            );
            if (s) s.currency = el.value;
          }),
      );
      $$("[data-tier]").forEach(
        (el) =>
          (el.onchange = () => {
            let s = loadout.supports.find((s) => s.id === +el.dataset.tier);
            if (s) {
              s.tier = +el.value;
              renderHub();
              showSupports();
            }
          }),
      );
    },
  );
}
function showStash() {
  showModal(
    "Kho Hồn Thành",
    `<p class="intro">Trang bị trong kho được lấy ra khi xuất chiến và có thể mất khi tử vong. Mua bản mới tại đây nếu đã mất. Quà khởi tạo gồm 12 Hoàn và 7 Cốt, mỗi loại một bản.</p><div class="bag-grid">${profile.stash.map((i) => `<div class="bag-item">${lootArt(i)}<small>${i.code}</small><p>${i.name} ${i.count > 1 ? "×" + i.count : ""}</p><button class="small" data-liquidate="${i.uid}">Thẩm định ${i.value * (i.count ?? 1)} TB</button></div>`).join("") || '<p class="empty">Kho trống</p>'}</div><h3 class="mini-header">Bổ sung trang bị Hồn Thành</h3><div class="catalog">${[...RINGS.map((r) => ({ kind: "ring", ...r, price: 120 })), ...BONES.map((r) => ({ kind: "bone", ...r, price: r.id === 7 ? 600 : 180 }))].map((i) => `<div class="item-card">${lootArt(i)}<h3>${i.name}</h3><button class="small" data-gear="${i.kind}:${i.id}:${i.price}">Mua ${i.price} TB</button></div>`).join("")}</div>`,
    () => {
      $$("[data-liquidate]").forEach(
        (el) =>
          (el.onclick = async () => {
            if (onlineAccount) {
              try {
                await api("/shop", {
                  kind: "liquidate",
                  uid: el.dataset.liquidate,
                });
                profile = (await api("/me")).profile;
                sanitizeLoadout();
                renderHub();
                showStash();
              } catch (e) {
                toast(e.message);
              }
              return;
            }
            let i = profile.stash.find((i) => i.uid === el.dataset.liquidate);
            profile.tb += i.value * (i.count ?? 1);
            profile.stash = profile.stash.filter((s) => s !== i);
            save();
            sanitizeLoadout();
            renderHub();
            showStash();
          }),
      );
      $$("[data-gear]").forEach(
        (el) =>
          (el.onclick = () =>
            guarded(() => {
              let [kind, id, p] = el.dataset.gear.split(":");
              if (onlineAccount) {
                api("/shop", { kind: "gear", type: kind, id: +id })
                  .then(() => api("/me"))
                  .then((me) => {
                    profile = me.profile;
                    renderHub();
                    showStash();
                  })
                  .catch((e) => toast(e.message));
                return;
              }
              if (profile.tb < +p) throw Error("Không đủ TB");
              profile.tb -= +p;
              profile.stash.push(R.loot(kind, +id));
              save();
              renderHub();
              showStash();
            })),
      );
    },
  );
}
function sanitizeLoadout() {
  loadout.rings = loadout.rings.map((id) => (ownsGear("ring", id) ? id : 0));
  loadout.bones = loadout.bones.filter((id) => ownsGear("bone", id));
  loadout.brought = Math.min(
    loadout.brought,
    Math.floor(profile.tb / 10) * 10,
    300,
  );
}
async function showHistory() {
  if (onlineAccount) {
    try {
      const rows = await api("/leaderboard");
      world.setLeaders(rows);
      showModal(
        "Đài Vinh Danh · Tuần này",
        rows
          .map(
            (r, i) =>
              `<div class="stash-entry">${i + 1}. ${r.username} · ${money(r.value)} TB</div>`,
          )
          .join("") || "Chưa có thành tích.",
      );
    } catch (e) {
      toast(e.message);
    }
    return;
  }
  world.setLeaders(
    [...profile.record].sort((a, b) => b.value - a.value).slice(0, 3),
  );
  showModal(
    "Đài Vinh Danh · Lưu dấu Hồn Sư",
    `<p class="intro">Thành tích trên thiết bị này. Ba lần Hồi Hoàn có giá trị cao nhất:</p>${
      [...profile.record]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(
          (r, i) =>
            `<div class="stash-entry">${["Ⅰ", "Ⅱ", "Ⅲ"][i]} · ${r.title} · ${money(r.value)} TB thẩm định · ${r.kills} hạ gục</div>`,
        )
        .join("") || '<div class="empty">Chưa có trận đấu hoàn tất.</div>'
    }`,
  );
}
function showHelp() {
  showModal(
    "Cẩm nang Hồn Giới",
    `<div class="help"><p>Săn Hồn thú → nhặt chiến lợi phẩm → mua/ghép Bổ phẩm → rút qua Cổng để giữ tài sản. Đây là bản ngoại tuyến, 1 người chơi cùng bot; trận vẫn chạy khi mở túi/cửa hàng.</p><h3>Điều khiển</h3><p>Cảm ứng: cần trái di chuyển; giữ/kéo nút kỹ năng để ngắm, thả để tung. Nút kiếm đánh thường; ba lá bùa ở bên phải. PC: WASD di chuyển, chuột ngắm, Q/W/E/R kỹ năng, F Linh Bộ, Space đánh thường, 1/2/3 Trợ phẩm, G nhặt đồ, B cửa hàng, I túi đồ. Vì W trùng di chuyển, dùng Shift+W để thi triển W trên PC; nút W cảm ứng luôn dùng được.</p><h3>Tài sản & Hồi Hoàn</h3><p>Vốn mang vào tối đa 300 TB, tiêu trước tiền kiếm mới. Cửa hàng chỉ hoạt động gần Đài/Thương Nhân. Tối đa 7 Bổ phẩm, bán 60%, ghép đủ nguyên liệu + phí. Túi 24 ô/48W. Cổng mở 05:00, 10:00, 15:00 trong 120s; 20:00 có 3 Đại Cổng. Đứng 20+2×ceil(W/4)s. Hạ Gian có sàn 15s. Bị đánh không hủy, CC chỉ tạm dừng tổng 3s; ra khỏi vòng quá 0,8s thì hủy. Trang bị tháo gửi được ký quỹ và hoàn lại khi hủy.</p><h3>Thử nghiệm nhanh</h3><p>Mở “DEV SANDBOX” góc trên phải để nhận 500 TB/Hồn Tinh, dịch chuyển, gọi Cổng, tua lịch, thêm chiến lợi phẩm, nhận CC hoặc sát thương. Tới Bí Cảnh, kích hoạt hai Ấn Khóa để gọi Cổ Long. Minimap: xanh là bạn/đồng đội, đỏ là địch đã thấy, vàng là Đài, tím là Tế Đàn, vòng ngọc là Cổng. Chạm bản đồ để đặt dấu dẫn đường.</p><h3>Phạm vi bản dựng</h3><p>Tài khoản và kho dùng localStorage; không nạp tiền thật. Ranked offline chỉ mô phỏng chuẩn hóa skin với bot; online dùng máy chủ. Chế độ online có máy chủ30Hz và PostgreSQL/Redis; Ranked chờ tối thiểu60 tài khoản thật. Chưa chứng nhận hiệu năng trên máy Android thật. Các giả định và phần chưa khớp hoàn toàn GDD được ghi trong docs/GDD-COVERAGE.md.</p><h3>Android / AI Studio</h3><p>Chạy npm install rồi npm run dev. Build npm run build. Dùng thư mục dist cho máy chủ web/AI Studio hỗ trợ dự án Vite. Capacitor: npm run android:add, npm run android:sync, npx cap open android. Xem docs/ANDROID.md cho SDK, Activity, chế độ ngang và APK.</p></div>`,
  );
}
async function startMatch(event) {
  if(!onlineAccount&&(pendingSnapshot||pendingRun)){toast('Hãy tiếp tục hoặc xác nhận bỏ trận dở trước khi bắt đầu trận mới.');return false;}
  const token=lifecycle.begin(event);if(token===null)return false;app.inert=true;
  try {await worldReady;if(!lifecycle.valid(token))return false;return await launchMatch(token);}
  catch(error){world?.releaseBattlefield();lifecycle.cancel();const button=$('#start');if(button){button.disabled=false;button.textContent='BẮT ĐẦU TRẬN ĐẤU';}throw error;}
  finally{app.inert=false;}
}
async function launchMatch(token) {
  const button=$("#start");if(button?.disabled){lifecycle.cancel();return;}
  if(button){button.disabled=true;button.textContent="ĐANG CHUẨN BỊ CHIẾN TRƯỜNG…";}
  if(!onlineAccount){R.validateLoadout(loadout);sanitizeLoadout();if(profile.nb<supportCost())throw Error('Không đủ Ngân Bảo để mang Trợ phẩm');if(profile.tb<loadout.brought+supportTbCost())throw Error('Không đủ Thanh Bảo');}
  try{await world.prepareBattlefield(structuredClone(loadout));}catch(error){if(button){button.disabled=false;button.textContent="BẮT ĐẦU TRẬN ĐẤU";}throw error;}
  if(button){button.disabled=false;button.textContent="BẮT ĐẦU TRẬN ĐẤU";}
  if(!lifecycle.valid(token))return false;
  if (onlineAccount) {
    return startOnline(token);
  }
  R.validateLoadout(loadout);
  sanitizeLoadout();
  const price = supportCost();
  if (profile.nb < price) throw Error("Không đủ Ngân Bảo để mang Trợ phẩm");
  if (profile.tb < loadout.brought + supportTbCost())
    throw Error("Không đủ Thanh Bảo");
  const actualGear=[];
  for(const [kind,ids] of [['ring',loadout.rings],['bone',loadout.bones]])for(const id of ids)if(id){
    const item=profile.stash.find(i=>i.kind===kind&&i.id===id);
    if(!item)throw Error('Trang bị không còn trong kho');actualGear.push({...item,brought:true});
  }
  const candidate = new Match(structuredClone(loadout), profile, (type, data) => {
    if (type === "message") toast(data);
    if (type === "hit") audio.hit();
    if (type === "save") save();
    if (type === "sendPanel") showSend();
    if (type === "end") setTimeout(showResult, 50);
  });
  profile.nb-=price;profile.tb-=loadout.brought+supportTbCost();
  const ids=new Set(actualGear.map(item=>item.uid));profile.stash=profile.stash.filter(item=>!ids.has(item.uid));
  world.reset();match=candidate;lifecycle.enter(token);match.performanceTiering=true;
  match.obstacles = world.obstacles;
  match.player.gear = actualGear;
  paused = false;
  renderHUD();
  save();
  toast("Xuất chiến! Hãy dùng G / nút NHẶT để lấy rương gần điểm xuất phát.");
  fullscreen();
}
function renderHUD() {
  skillshot.reset();
  autoFarm.reset();
  const a = match.player;
  app.innerHTML = `<main class="hud"><div class="top-hud"><div class="minimap-wrap"><canvas id="minimap" width="280" height="280" aria-label="Minimap tương tác"></canvas><div class="map-title">THƯƠNG MANG CỔ VỰC</div></div><div class="match-status"><span>◷ <b id="matchTime">00:00</b></span><i class="divider"></i><span>CÒN SỐNG <b id="alive">100</b></span><i class="divider"></i><span>HẠ GỤC <b id="kills">0</b></span></div><details class="debug"><summary>DEV SANDBOX / THỬ NHANH</summary><div class="debug-body"><button data-debug="money">+500 TB / Tinh</button><button data-debug="loot">+ Chiến lợi phẩm</button><button data-debug="gate">Tới Cổng</button><button data-debug="shop">Tới Đài</button><button data-debug="shrine">Tới Tế Đàn</button><button data-debug="boss">Hang Boss</button><button data-debug="realm">Tới Bí Cảnh</button><button data-debug="open">Mở Cổng ngay</button><button data-debug="next" class="wide">Tua tới đợt Cổng kế tiếp</button><button data-debug="cc">Nhận CC 1s</button><button data-debug="hit">Nhận 150 ST</button><button data-debug="heal">Hồi HP / HL</button><button data-debug="death">Thử tử vong</button></div></details></div><div class="location" id="location"></div><div class="banner" id="gateBanner"></div><div class="quick-wallet">◈ Vốn <b id="brought"></b> TB<br>✦ Thu nhập <b id="earned"></b> TB<br><small id="bagBrief"></small></div><div id="joystickZone" aria-label="Vùng di chuyển"><div class="joystick" id="joystick"><div class="stick"></div><div class="joystick-label">DI CHUYỂN</div></div></div><div id="quickOffers" class="quick-offers"></div><div class="context-actions"><button id="pickup">◇ NHẶT / G</button><button id="shop">◈ CỬA HÀNG / B</button><button id="bag">▦ TÚI ĐỒ / I</button><button id="extract">⟡ HỒI HOÀN</button><button id="seal" class="hidden">✧ KÍCH HOẠT ẤN KHÓA</button></div><div class="player-bar"><div class="row"><span id="level">LV.1</span><span id="hpText"></span><span class="shield-value" id="shield"></span></div><div class="bar"><i id="hpFill"></i></div><div class="bar mp"><i id="mpFill"></i></div><div class="player-label" id="playerStatus">${HEROES[a.hero].name} · ${HEROES[a.hero].branches[a.branch]}</div></div><div id="autoFarmDock" class="autofarm-dock" data-mode="off"><button id="autoFarmToggle" title="AUTO FARM: TẮT · Giữ chuột phải để tùy chỉnh">🤖<small>AUTO FARM</small><b>TẮT</b></button><button id="autoFarmSettings" aria-label="Tùy chỉnh Auto">⚙</button><span id="autoFarmStatus"></span></div><div id="autoFarmHint" class="auto-hint hidden"></div><div id="cancelSkill" class="cancel-skill hidden">✕<small>KÉO VÀO ĐÂY<br>ĐỂ HỦY CHIÊU</small></div><div class="supports-hud">${a.supports
    .map(
      (s, i) =>
        `<button data-use="${i}" title="${SUPPORTS[s.id - 1].text}" aria-label="${SUPPORTS[s.id - 1].name}">${itemIcon("support", s.id)}<span class="support-key">${i + 1}</span><small class="support-count"></small></button>`,
    )
    .join(
      "",
    )}</div><div class="skills">${[0, 1, 2, 3, 4].map((k) => `<button class="skill" data-skill="${k}" aria-label="${k === 4 ? "F Linh Bộ" : SKILLS[a.hero][k].name}" style="--element:#${HEROES[a.hero].color.toString(16).padStart(6, "0")}">${k === 4 ? itemIcon("action", 2) : `<img class="skill-art" src="${skillIcon(a.hero, k)}" alt="" draggable="false">`}<b>${["Q", "W", "E", "R", "F"][k]}</b><small>${k === 4 ? "LINH BỘ" : SKILLS[a.hero][k].name}</small><span class="mp-cost">${k === 4 ? "0" : R.skillFor(a, k).mp} HL</span><span class="energy-empty"></span><span class="skill-thumb-knob"></span><span class="cd hidden"></span></button>`).join("")}<button id="targetBeast" class="target-choice" aria-label="Đánh quái" aria-pressed="false">${itemIcon("action", 3)}</button><button id="targetHero" class="target-choice" aria-label="Đánh tướng máu thấp" aria-pressed="false">${itemIcon("action", 4)}</button><button id="attack" class="skill attack" aria-label="Đánh thường">${itemIcon("action", 1)}<small>ĐÁNH THƯỜNG</small></button></div><div id="channelRoot"></div><details class="hud-options"><summary aria-label="Tùy chọn trận">⋯</summary><div class="hud-menu"><button id="menuHelp">?</button><button id="pause">Tạm dừng</button><button id="exitGame">Rời trận</button><button id="gameFullscreen">⛶</button><button id="quality" aria-label="Chất lượng đồ họa">ĐỒ HỌA</button><button id="securityShield">HỘ GIỚI</button></div></details><div class="performance" id="performance"></div><div id="modalRoot"></div></main>`;
  $("#autoFarmToggle").onclick = () => {
    const modes = ["off", "pve", "full"];
    autoFarm.setMode(modes[(modes.indexOf(autoFarm.mode) + 1) % 3]);
    updateAssetLoadingIndicator();
  updateAutoHUD();
  };
  $("#autoFarmToggle").oncontextmenu = (e) => {
    e.preventDefault();
    showAutoSettings();
  };
  $("#autoFarmSettings").onclick = showAutoSettings;
  $("#pickup").onclick = showAppraisal;
  $("#securityShield").onclick = showSecurity;
  $("#quality").onclick = () =>
    showModal(
      "Chất lượng đồ họa",
      '<p class="intro">Mức Chi tiết bật bloom, ánh sáng vũ khí và bóng4096. Mức Cân bằng dùng bóng1024 và giảm tải hậu kỳ cho giao tranh đông. Cả hai đều dùng LOD.</p><div class="row"><button id="qualityBalanced">CÂN BẰNG</button><button id="qualityUltra">CHI TIẾT</button></div>',
      () => {
        $("#qualityBalanced").onclick = () => {
          world.setQuality("balanced");
          closeModal();
        };
        $("#qualityUltra").onclick = () => {
          world.setQuality("ultra");
          closeModal();
        };
      },
    );
  for (const [id, targetMode] of [
    ["targetBeast", "beast"],
    ["targetHero", "hero-low"],
  ]) {
    const el = $("#" + id);
    el.onclick = () => {
      input.targetMode = input.targetMode === targetMode ? "auto" : targetMode;
      updateHUD();
    };
  }
  const context = $(".context-actions");
  context.insertAdjacentHTML(
    "beforeend",
    '<button id="absorbDirect">HẤP THU HOÀN · 8s</button><button id="sendDirect">GỬI ĐỒ · HOÃN NHÂN HỒI</button>',
  );
  $("#sendDirect").onclick = showSend;
  $("#absorbDirect").onclick = () =>
    guarded(() => {
      const ring = contextualActions(match).ring;
      if (ring) match.equipRing(ring.uid, RINGS[ring.id - 1].slot);
    });
  $("#quickOffers").onclick = (e) => {
    const button = e.target.closest("[data-quick]");
    if (!button) return;
    const offer = quickOffers(match)[+button.dataset.quick];
    if (offer && !offer.disabled)
      guarded(() => match.shop(offer.action, offer.id));
  };
  $("#shop").onclick = showShop;
  $("#bag").onclick = showBag;
  $("#extract").onclick = showExtraction;
  $("#menuHelp").onclick = showHelp;
  $("#gameFullscreen").onclick = fullscreen;
  $("#seal").onclick = () => {
    if (match.seals < 2) {
      if (match.online) {
        match.activateSeal();
        return;
      }
      match.seals++;
      toast(`Ấn Khóa ${match.seals}/2 đã mở.`);
    }
  };
  $("#pause").onclick = () => {
    if (match.online) {
      toast("Trận online tiếp tục trên server; không thể tạm dừng.");
      return;
    }
    paused = !paused;
    $("#pause").textContent = paused ? "Tiếp tục" : "Tạm dừng";
    toast(paused ? "Mô phỏng ngoại tuyến đã tạm dừng." : "Tiếp tục chiến đấu");
  };
  $("#exitGame").onclick = () =>
    showModal(
      "Rời trận",
      `<p class="intro">Rời trận được tính là tử vong: rơi đồ và thu nhập, hoàn 50% vốn chưa tiêu.</p><button id="confirmExit" class="danger">Xác nhận rời trận</button>`,
      () =>
        ($("#confirmExit").onclick = () => {
          closeModal();
          if(!match.online)a.downedUntil=1;
          match.kill(a, { team: -1, kind: "beast" });
        }),
    );
  $$("[data-use]").forEach(
    (el) =>
      (el.onclick = () => guarded(() => match.useSupport(+el.dataset.use))),
  );
  $$("[data-debug]").forEach(
    (el) => (el.onclick = () => guarded(() => debug(el.dataset.debug))),
  );
  $("#minimap").onpointerdown = (e) => {
    const wrap = $(".minimap-wrap");
    if (!wrap.classList.contains("map-expanded")) {
      wrap.classList.add("map-expanded");
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    match.player.goalMarker = {
      x: ((e.clientX - r.left) / r.width) * 200 - 100,
      z: ((e.clientY - r.top) / r.height) * 200 - 100,
    };
    wrap.classList.remove("map-expanded");
    toast("Đã đánh dấu trên bản đồ.");
  };
  const portal = document.createElement("button");
  portal.id = "realmPortal";
  portal.textContent = "⟐ CỔNG BÍ CẢNH";
  portal.onclick = () => guarded(() => match.usePortal());
  $(".context-actions").append(portal);
  if (match.online) $(".debug").classList.add("hidden");
  const sound = document.createElement("button");
  sound.textContent = "♫";
  sound.onclick = () => {
    audio.unlock();
    toast(audio.toggle() ? "Âm thanh bật" : "Âm thanh tắt");
  };
  $(".hud-menu").append(sound);
  const autoSettings = document.createElement("button");
  autoSettings.textContent = "⚙ TÙY CHỈNH AUTO";
  autoSettings.onclick = showAutoSettings;
  $(".hud-menu").append(autoSettings);
  bindJoystick();
  bindSkills();
}
function controlInput() {
  const status = autoFarm.status(),
    automated = status.mode !== "off" && !status.manualPaused;
  let x = automated ? autoInput.x : input.x,
    z = automated ? autoInput.z : input.z;
  const horizontal = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
    vertical = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
  if (horizontal || vertical) {
    const direction = screenVectorToWorld(
      horizontal,
      vertical,
      Math.atan2(
        world.camera.position.x - world.focus.x,
        world.camera.position.z - world.focus.z,
      ),
    );
    x = direction.x;
    z = direction.z;
  }
  return {
    x: modal ? 0 : x,
    z: modal ? 0 : z,
    attack:
      !modal &&
      (input.attack || keys.has("Space") || (automated && autoInput.attack)),
    targetMode: automated ? autoInput.targetMode : input.targetMode,
  };
}
function pushInputEdge(force = true) {
  if (match?.online && match.player) match.step(0, controlInput(), force);
}
function bindJoystick() {
  const zone = $("#joystickZone"),
    joy = $("#joystick"),
    stick = $(".stick");
  let pid = null,
    origin = null;
  const reset = () => {
    if (pid !== null) skillshot.endMovement(pid);
    pid = null;
    origin = null;
    input.x = input.z = 0;
    stick.style.transform = "";
    joy.classList.remove("active");
    pushInputEdge();
  };
  releaseJoystick = reset;
  zone.onpointerdown = (e) => {
    if (pid !== null || modal || !skillshot.beginMovement(e.pointerId)) return;
    e.preventDefault();
    pid = e.pointerId;
    origin = { x: e.clientX, y: e.clientY };
    const r = zone.getBoundingClientRect();
    joy.style.left = e.clientX - r.left - 48 + "px";
    joy.style.top = e.clientY - r.top - 48 + "px";
    joy.style.bottom = "auto";
    joy.classList.add("active");
    zone.setPointerCapture(pid);
    input.x = input.z = 0;
    pushInputEdge();
  };
  zone.onpointermove = (e) => {
    if (e.pointerId !== pid || !origin) return;
    const dx = e.clientX - origin.x,
      dy = e.clientY - origin.y,
      n = Math.hypot(dx, dy),
      limit = 34,
      x = dx / Math.max(limit, n),
      y = dy / Math.max(limit, n);
    stick.style.transform = `translate(${x * limit}px,${y * limit}px)`;
    const direction = screenVectorToWorld(
      x,
      y,
      Math.atan2(
        world.camera.position.x - world.focus.x,
        world.camera.position.z - world.focus.z,
      ),
    );
    input.x = direction.x;
    input.z = direction.z;
    pushInputEdge(false);
  };
  zone.onpointerup =
    zone.onpointercancel =
    zone.onlostpointercapture =
      (e) => {
        if (e.pointerId === pid) reset();
      };
}
function bindSkills() {
  $$("[data-skill]").forEach((el) => {
    const slot = +el.dataset.skill;
    el.onpointerdown = (e) => {
      e.preventDefault();
      if (modal) return;
      if (
        skillshot.begin(
          e.pointerId,
          slot,
          el.getBoundingClientRect(),
          e.clientX,
          e.clientY,
        )
      )
        el.setPointerCapture(e.pointerId);
    };
    el.onpointermove = (e) => skillshot.move(e.pointerId, e.clientX, e.clientY);
    el.onpointerup = (e) => skillshot.finish(e.pointerId, e.clientX, e.clientY);
    el.onpointercancel = el.onlostpointercapture = (e) =>
      skillshot.cancel(e.pointerId);
  });
  const attack = $("#attack");
  let pointer = null;
  attack.onpointerdown = (e) => {
    if (pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    autoFarm.manualStart(pointer);
    input.attack = true;
    pushInputEdge();
    attack.setPointerCapture(pointer);
    attack.classList.add("pressed");
  };
  attack.onpointerup =
    attack.onpointercancel =
    attack.onlostpointercapture =
      (e) => {
        if (e.pointerId !== pointer) return;
        autoFarm.manualEnd(pointer);
        pointer = null;
        input.attack = false;
        attack.classList.remove("pressed");
        pushInputEdge();
      };
}

function showShop() {
  const near = match.nearShop();
  if (!near) {
    toast("Cửa hàng chỉ giao dịch khi ở cách Đài/Thương Nhân dưới 6m.");
    return;
  }
  const a = match.player;
  showModal(
    near.merchant
      ? "Thương Nhân Hồn Giới · Giảm 15%"
      : "Đài Giao Dịch Hồn Hoàn",
    `<div class="row between"><p class="intro">Vốn: ${money(a.wallet.brought)} · Thu nhập: ${money(a.wallet.earned)} TB<br>7 ô đồng thời · Bán 60% giá gốc · Không giới hạn lượt giao dịch</p><small>${a.items.length}/7 Ô</small></div><div class="inventory-slots">${Array.from({ length: 7 }, (_, i) => (a.items[i] ? `<div class="inventory-slot">${itemIcon("item", a.items[i], { label: ITEMS[a.items[i] - 1].name })}${ITEMS[a.items[i] - 1].name}<br><button data-sell="${i}">Bán ${money(ITEMS[a.items[i] - 1].price * 0.6)}</button>${ITEMS[a.items[i] - 1].tier === 3 ? `<button data-dismantle="${i}">Tháo</button>` : ""}</div>` : '<div class="inventory-slot muted"><div class="empty-icon"></div>Trống</div>')).join("")}</div><p class="warning ${R.backlash(a.hero, a.items) ? "red" : ""}">Phản Phệ hiện tại: −${Math.round(R.backlash(a.hero, a.items) * 100)}%. Món tương khắc có cảnh báo đỏ trước khi mua.</p><div class="catalog">${ITEMS.filter(
      (i) => !near.merchant || i.tier === 3,
    )
      .map(
        (i) =>
          `<div class="item-card">${itemIcon("item", i.id, { label: i.name })}<small>${i.code} / ${["", "PHÀM", "LINH", "THIÊN"][i.tier]} · ${i.group}</small><h3>${i.name}</h3><p>${Object.entries(
            i.stats,
          )
            .map(([k, v]) => `${k} +${v}`)
            .join(
              " · ",
            )}<br>${i.text}</p>${R.mismatch(a.hero, i.id) ? '<p class="red">⚠ Tương khắc: Phản Phệ −4% (trần −8%)</p>' : ""}<button data-buy="${i.id}" class="small">Mua ${money(i.price * (near.merchant ? 0.85 : 1))} TB</button></div>`,
      )
      .join(
        "",
      )}</div><h3 class="mini-header">Cây ghép Bậc Thiên</h3>${RECIPES.map(([out, p, l, fee]) => `<div class="recipe-row">${itemIcon("item", out, { label: ITEMS[out - 1].name })}<span>${ITEMS[p - 1].name} + ${ITEMS[l - 1].name} + ${fee} TB → <b class="gold">${ITEMS[out - 1].name}</b></span><button class="small" data-craft="${out}">Ghép</button></div>`).join("")}`,
    () => {
      for (const [action, attr] of [
        ["buy", "buy"],
        ["sell", "sell"],
        ["craft", "craft"],
        ["dismantle", "dismantle"],
      ])
        $$(`[data-${attr}]`).forEach(
          (el) =>
            (el.onclick = () =>
              guarded(() => {
                match.shop(action, +el.dataset[attr]);
                showShop();
              })),
        );
    },
  );
}
const appraisedLoot = new Set();
function showAppraisal() {
  clearTimeout(appraisalTimer);
  const drop = contextualActions(match).loot;
  if (!drop) {
    toast("Không có chiến lợi phẩm hợp lệ trong 3m.");
    return;
  }
  const a = match.player;
  const needsAppraisal = (i) =>
    !appraisedLoot.has(i.uid) &&
    (i.kind === "bone" ||
      i.kind === "weapon" ||
      (i.kind === "ring" && RINGS[i.id - 1]?.black));
  const scanning = drop.items.some(needsAppraisal);
  showModal(
    "Lục soát · Thẩm định chiến lợi phẩm",
    `<div class="loot-split"><section class="loot-own"><h3>TRANG BỊ & TÚI CỦA BẠN</h3><p class="intro">${a.bag.length}/24 Ô · ĐIỂM TẢI ${R.weight(a.bag)}/48 W</p><div class="loot-own-slots">${Array.from({ length: 24 }, (_, slot) => (a.bag[slot] ? `<div class="own-loot-slot" title="${a.bag[slot].name}">${lootArt(a.bag[slot])}<span>${a.bag[slot].w}W</span></div>` : '<div class="own-loot-slot empty-icon"></div>')).join("")}</div><h4>ĐANG MẶC</h4><div class="loot-equipped">${a.gear.map((i) => `<div title="${i.name}">${lootArt(i)}<small>${i.w}W</small></div>`).join("")}</div><h4>BỔ PHẨM ${a.items.length}/7</h4><div class="loot-equipped">${a.items.map((id) => itemIcon("item", id, { label: ITEMS[id - 1].name })).join("")}</div></section><section class="loot-found"><h3>CHIẾN LỢI PHẨM TRONG HÒM</h3><p class="intro">${money(drop.tb ?? 0)} TB · ${drop.essence ?? 0} Hồn Tinh</p><div class="loot-found-grid">${drop.items.map((i) => `<button class="loot-inspection ${needsAppraisal(i) ? "appraising" : "appraised"}" data-loot-uid="${i.uid}" ${needsAppraisal(i) ? "disabled" : ""} aria-label="Nhặt ${i.name}">${lootArt(i)}<span class="appraisal-beam"></span><span class="appraisal-lens" aria-hidden="true"></span><span class="appraisal-info"><strong>${i.name}</strong><span>${i.code} · ${i.w}W · ×${i.count ?? 1}</span><b>${money(i.value ?? 0)} TB</b></span><span class="appraisal-state">${needsAppraisal(i) ? "ĐANG THẨM ĐỊNH · 0.8s" : "CHẠM ĐỂ NHẶT"}</span></button>`).join("") || '<p class="empty">Hòm chứa tiền và Hồn Tinh.</p>'}</div><button id="lootQuick" class="primary" ${scanning ? "disabled" : ""}>NHẶT NHANH ĐỒ QUÝ</button></section></div>`,
    () => {
      const refresh = () => {
        if (contextualActions(match).loot) showAppraisal();
        else closeModal();
      };
      $$("[data-loot-uid]").forEach(
        (button) =>
          (button.onclick = () =>
            guarded(() => {
              const item = drop.items.find(
                (i) => i.uid === button.dataset.lootUid,
              );
              if (!item || needsAppraisal(item)) return;
              if (typeof match.pickupSelected !== "function")
                throw Error("Máy chủ chưa hỗ trợ nhặt riêng vật phẩm");
              match.pickupSelected(item.uid);
              if (match.online) setTimeout(refresh, 150);
              else refresh();
            })),
      );
      $("#lootQuick").onclick = () =>
        guarded(() => {
          match.pickup();
          closeModal();
        });
      if (scanning)
        appraisalTimer = setTimeout(() => {
          if (modal !== "Lục soát · Thẩm định chiến lợi phẩm") return;
          for (const i of drop.items) appraisedLoot.add(i.uid);
          $$(".loot-inspection.appraising").forEach((el) => {
            el.classList.remove("appraising");
            el.classList.add("appraised");
            el.disabled = false;
            $(".appraisal-state", el).textContent = "CHẠM ĐỂ NHẶT";
          });
          $("#lootQuick").disabled = false;
          audio.tone(1046.5, 0.12, "sine", 0.16);
          audio.tone(1568, 0.18, "triangle", 0.08);
        }, 800);
    },
  );
}

function showBag() {
  const a = match.player;
  showModal(
    "Túi chiến trường",
    `<p class="intro">${a.bag.length}/24 ô · ${R.weight(a.bag)}/48 Điểm Tải · Tế Đàn: hấp thu Hoàn 8 giây, không di chuyển.</p><div class="bag-grid">${a.bag.map((i) => `<div class="bag-item">${lootArt(i)}<small>${i.code} · ${i.w}W</small><p>${i.name}${i.count > 1 ? " ×" + i.count : ""}</p>${i.kind === "ring" && R.ringCompatible(a.hero, i.id, RINGS[i.id - 1].slot) ? `<button class="small" data-equip="${i.uid}">Hấp thu khe ${RINGS[i.id - 1].slot}</button>` : ""}<button class="small danger" data-drop="${i.uid}">Thả</button></div>`).join("") || '<p class="empty">Túi trống · Nhặt rương hoặc săn Hồn thú.</p>'}</div><h3 class="mini-header">Trang bị đang mặc · ${R.weight(a.gear)}W nếu mang về</h3><div class="bag-grid">${a.gear.map((i) => `<div class="bag-item">${lootArt(i)}<small>${i.code} · ${i.brought ? "MANG VÀO" : "NHẶT TRẬN"}</small><p>${i.name}</p></div>`).join("")}</div><div class="row" style="margin-top:15px"><button id="boneActive" class="small">Bát Chu Mâu / CD60s</button><button id="itemActive" class="small">Thất Tinh Trận Bàn / CD60s</button></div>`,
    () => {
      $$("[data-equip]").forEach(
        (el) =>
          (el.onclick = () =>
            guarded(() => {
              const i = a.bag.find((i) => i.uid === el.dataset.equip);
              match.equipRing(i.uid, RINGS[i.id - 1].slot);
              closeModal();
              toast("Đang hấp thu 8 giây. Hãy đứng yên.");
            })),
      );
      $$("[data-drop]").forEach(
        (el) =>
          (el.onclick = () => {
            if (a.channel) {
              toast("Không thể thả đồ đã đăng ký Hồi Hoàn");
              return;
            }
            if (match.online) {
              match.dropItem(el.dataset.drop);
              return;
            }
            const i = a.bag.find((i) => i.uid === el.dataset.drop);
            a.bag = a.bag.filter((j) => j !== i);
            match.makeDrop(a.x + 1, a.z + 1, [i]);
            showBag();
          }),
      );
      $("#boneActive").onclick = () => guarded(() => match.activateBone());
      $("#itemActive").onclick = () => guarded(() => match.activateItem());
    },
  );
}
function showExtraction() {
  const a = match.player;
  if (a.channel) {
    match.cancelExtraction();
    return;
  }
  if (!match.gates.some((g) => g.end > match.time && R.distance(g, a) < 3.5)) {
    toast("Đến Cổng đang mở để Hồi Hoàn. Dùng Sandbox để thử ngay.");
    return;
  }
  const w = R.weight([...a.bag, ...a.gear]);
  showModal(
    "Cổng Hồi Hoàn · Chọn vận mệnh",
    `<p class="intro">Rút lui chuyển toàn bộ tài sản về Hồn Thành và kết thúc trận. Hoãn Nhân Hồi gửi gói đồ được chọn rồi tiếp tục chiến đấu.</p><p class="warning">Tải hiện tại: ${w}W. ${w <= 48 ? `Thời gian rút: ${R.extractionTime(w, match.support(a, 18)?.tier ?? 0)}s.` : "Vượt 48W: cần gửi/thả bớt trước khi rút."} Giảm ST khi đứng Cổng: ${(R.gateReduction(!!match.support(a, 5)) * 100).toFixed(2)}%.</p><div class="row"><button id="exitExtract" class="primary" ${w > 48 ? "disabled" : ""}>RÚT LUI THÀNH CÔNG</button><button id="sendExtract" ${!match.support(a, 17) || match.support(a, 17).used ? "disabled" : ""}>HOÃN NHÂN HỒI · GỬI ĐỒ</button></div>`,
    () => {
      $("#exitExtract").onclick = () =>
        guarded(() => {
          match.beginExtraction();
          closeModal();
        });
      $("#sendExtract").onclick = showSend;
    },
  );
}
function showSend() {
  const a = match.player;
  showModal(
    "Hoãn Nhân Hồi · Đăng ký gói đồ",
    `<p class="intro">Chọn đồ trong túi và trang bị muốn tháo gửi. EARNED_THANH_BAO được chuyển toàn bộ; BROUGHT_THANH_BAO vẫn ở lại. Trang bị chọn sẽ tháo ngay vào ký quỹ khi bắt đầu.</p><div class="bag-grid">${[...a.bag, ...a.gear].map((i) => `<div class="bag-item">${lootArt(i)}<label><input type="checkbox" data-send="${i.uid}" checked> ${i.name}<br><small>${i.w}W · ${a.gear.includes(i) ? "Đang mặc" : "Túi"}</small></label></div>`).join("") || '<p class="empty">Không có đồ; vẫn có thể gửi thu nhập.</p>'}</div><p id="sendWeight" class="intro" style="margin-top:14px"></p><button id="confirmSend" class="primary">BẮT ĐẦU GỬI ĐỒ</button>`,
    () => {
      const update = () => {
        const selected = $$("[data-send]:checked").map((e) => e.dataset.send),
          items = [...a.bag, ...a.gear].filter((i) => selected.includes(i.uid)),
          w = R.weight(items);
        $("#sendWeight").textContent =
          `Gói ${w}/48W · ${w <= 48 ? R.extractionTime(w, match.support(a, 18)?.tier ?? 0) + " giây" : "Vượt tải"} · ${money(a.wallet.earned)} TB thu nhập`;
        $("#confirmSend").disabled = w > 48;
      };
      $$("[data-send]").forEach((el) => (el.onchange = update));
      update();
      $("#confirmSend").onclick = () =>
        guarded(() => {
          match.beginExtraction(
            "send",
            $$("[data-send]:checked").map((e) => e.dataset.send),
          );
          closeModal();
        });
    },
  );
}
function showResult() {
  if (!match?.result) return;
  const r = match.result;
  showModal(
    "Kết trận",
    `<div class="result"><div class="eyebrow">THƯƠNG MANG CỔ VỰC / ${clock(r.time)}</div><div class="result-symbol">${r.type === "death" ? "殇" : "魂"}</div><h2>${r.title}</h2><p>${r.kills} hạ gục · Lv.${match.player.level}<br>${r.type === "death" ? `Hoàn ${money(r.details.refund ?? 0)} TB vốn · ${r.details.saved?.length ?? 0} trang bị được bảo hiểm.` : `${money(r.details.value ?? 0)} TB giá trị chiến lợi phẩm · Thưởng Bội Linh ${money(r.details.bonus ?? 0)} TB.`}<br>Số dư Hồn Thành: ${money(profile.tb)} TB / ${money(profile.nb)} NB</p><button id="backHub" class="primary">TRỞ VỀ HỒN THÀNH</button></div>`,
    () => {
      $("#closeModal").onclick = backHub;
      $("#backHub").onclick = backHub;
    },
  );
}
function cleanupWorldForLobby(){for(const method of ['reset','releaseBattlefield'])try{world?.[method]?.();}catch(error){bootMetrics.cleanupError=error.message;}}
function backHub() {
  if(match&&!match.online){if(!save())return false;pendingSnapshot=pendingRun=null;}
  skillshot.reset();
  autoFarm.reset();
  if (match?.online) match.close();
  match = null;
  lifecycle.cleanup();
  modal = null;
  paused = false;
  input.attack = false;
  keys.clear();
  cleanupWorldForLobby();
  sanitizeLoadout();
  save();
  renderHub();
}
function debug(action) {
  if (!match) return;
  return ensureRuntimeSecurity(match).sandbox(() => debugAction(action));
}
function debugAction(action) {
  if (match.online) {
    toast("Sandbox chỉ dùng ngoại tuyến");
    return;
  }
  const a = match.player;
  if (action === "money") {
    match.reward(a, 500, 500);
    toast("Sandbox: +500 Thanh bảo chiến trường và +500 Hồn Tinh.");
  }
  if (action === "loot") {
    for (const i of [
      R.loot("ring", RINGS.find((r) => r.heroes.includes(a.hero))?.id ?? 1),
      R.loot("material"),
      R.loot("bone", 1),
      R.loot("weapon"),
    ])
      R.addLoot(a, i);
    toast("Đã thêm chiến lợi phẩm vào túi.");
  }
  if (["gate", "shop", "shrine", "boss", "realm"].includes(action))
    match.teleport(action);
  if (action === "open") match.openDebugGates();
  if (action === "next") {
    const next = [300, 600, 900, 1200].find((t) => t > match.time) ?? 1200;
    match.debugGateEnd = 0;
    match.setTime(next);
    toast("Đã tua tới " + clock(next));
  }
  if (action === "cc") match.cc(a, 1);
  if (action === "hit")
    match.damage(
      match.actors.find((t) => t.team !== 0 && t.kind === "hero"),
      a,
      150,
      "true",
    );
  if (action === "heal") {
    a.hp = match.getStats(a).hp;
    a.mp = match.getStats(a).mp;
  }
  if (action === "death") {
    if (a.channel) match.cancelExtraction();
    match.kill(a, { team: -1, kind: "beast" });
  }
}
function updateSkillCooldowns() {
  const a = match?.player;
  if (!a || !$(".skills")) return;
  $$("[data-skill]").forEach((el) => {
    const k = +el.dataset.skill,
      cd = a.cooldowns[k],
      badge = $(".cd", el);
    badge.classList.toggle("hidden", cd <= 0);
    badge.textContent = cd.toFixed(1) + "s";
    const cost = k === 4 ? 0 : R.skillFor(a, k).mp;
    el.classList.toggle("no-energy", a.mp < cost);
    $(".mp-cost", el).textContent = `${cost} HL`;
    const total = k === 4 ? 8 : R.skillFor(a, k).cd;
    badge.style.background = `conic-gradient(#061c2de8 ${Math.min(1, cd / Math.max(total, 0.01)) * 360}deg, #061c2d22 0deg)`;
  });
}
function updateHUD() {
  if (!match || !match.player || !$("#matchTime")) return;
  const a = match.player,
    s = match.getStats(a);
  $("#matchTime").textContent = clock(match.time);
  $("#alive").textContent =
    match.aliveCount ??
    match.actors.filter((a) => a.kind === "hero" && a.alive && !a.extracted)
      .length;
  $("#kills").textContent = a.kills;
  $("#brought").textContent = money(a.wallet.brought);
  $("#earned").textContent = money(a.wallet.earned);
  $("#bagBrief").textContent =
    `Túi ${a.bag.length}/24 · ${R.weight(a.bag)}/48W`;
  $("#level").textContent = `LV.${a.level}`;
  $("#hpText").textContent =
    `${Math.ceil(Math.max(0, a.hp))} / ${Math.round(s.hp)}`;
  $("#shield").textContent = a.shield > 0 ? "▱ " + Math.ceil(a.shield) : "";
  $("#hpFill").style.width = Math.max(0, (a.hp / s.hp) * 100) + "%";
  $("#mpFill").style.width = (a.mp / s.mp) * 100 + "%";
  $("#playerStatus").textContent = a.downedUntil
    ? `HỒN SUY ${Math.ceil(a.downedUntil - match.time)}s · Cứu ${a.revive.toFixed(1)}/4s`
    : a.immuneCC > match.time
      ? "BÁ THỂ · MIỄN CC"
      : a.ccUntil > match.time
        ? "KHỐNG CHẾ CỨNG"
        : (match.bushes ?? MAP_BUSHES).some((b) => R.distance(a, b) < b.r)
          ? `ẨN THÂN · ${HEROES[a.hero].name}`
          : `${HEROES[a.hero].name} · ${a.stacks} tầng nội tại`;
  $("#location").textContent = REGIONS[match.region(a)].name.toUpperCase();
  updateSkillCooldowns();
  $$("[data-use]").forEach((el) => {
    const c = a.supports[+el.dataset.use];
    const maxUses = {
      2: c.tier === 2 ? 3 : 2,
      3: 1,
      7: 3,
      8: 1,
      9: 2,
      12: 1,
      14: 1,
      15: 2,
      16: 1,
      17: 1,
    }[c.id];
    $(".support-count", el).textContent =
      maxUses === undefined ? "NỘI TẠI" : Math.max(0, maxUses - (c.used || 0));
    el.style.opacity =
      c.used && [1, 4, 5, 6, 10, 11, 13, 18].includes(c.id) === false
        ? ".6"
        : "1";
  });
  $("#quickOffers").classList.toggle("hidden", !match.nearShop());
  const offers = quickOffers(match),
    key = JSON.stringify(
      offers.map((o) => [o.id, o.action, o.price, o.disabled, o.warning]),
    );
  if ($("#quickOffers").dataset.key !== key) {
    $("#quickOffers").dataset.key = key;
    $("#quickOffers").innerHTML = offers
      .map(
        (o, i) =>
          `<button data-quick="${i}" ${o.disabled ? "disabled" : ""} class="${o.warning ? "red" : ""}" title="${o.warning ? "Phản Phệ -4%/món, tối đa -8%. " : ""}${o.name}">${itemIcon("item", o.id, { label: o.name })}<b>${o.action === "craft" ? "GHÉP" : "MUA"} ${o.warning ? "!" : ""}</b><span>${o.name}</span><small>${money(o.price)} TB</small></button>`,
      )
      .join("");
  }
  const actions = contextualActions(match);
  $("#pickup").classList.toggle("hidden", !actions.loot);
  $("#absorbDirect").classList.toggle("hidden", !actions.ring || !!a.absorb);
  $("#sendDirect").classList.toggle("hidden", !actions.canSend || !!a.channel);
  $("#extract").classList.toggle("hidden", !actions.gate && !a.channel);
  $("#bag").textContent = `TÚI ${a.bag.length}/24`;
  $("#bag").title = `Túi ${a.bag.length}/24 ô | ${R.weight(a.bag)}/48W`;
  $("#shop").textContent = `ĐỒ ${a.items.length}/7`;
  $("#targetBeast").setAttribute(
    "aria-pressed",
    String(input.targetMode === "beast"),
  );
  $("#targetHero").setAttribute(
    "aria-pressed",
    String(input.targetMode === "hero-low"),
  );
  const c = a.channel;
  $("#channelRoot").innerHTML = c
    ? `<div class="channel"><h3>${c.mode === "send" ? "HOÃN NHÂN HỒI" : "CỔNG HỒI HOÀN"}</h3><p>${c.elapsed.toFixed(1)} / ${c.total.toFixed(1)} giây · ${R.weight(c.items)}W</p><div class="bar"><i style="width:${Math.min(100, (c.elapsed / c.total) * 100)}%"></i></div><small>${a.ccUntil > match.time && c.paused < 3 ? "TẠM DỪNG DO CC" : c.gate.end < match.time ? "OVERTIME GRACE · KẾT GIỚI DUY TRÌ" : "HỘ CỔNG ĐANG HIỆU LỰC"}</small></div>`
    : a.absorb
      ? `<div class="channel"><h3>HẤP THU HỒN HOÀN</h3><p>${a.absorb.time.toFixed(1)} / 8.0 giây</p><div class="bar"><i style="width:${(a.absorb.time / 8) * 100}%"></i></div></div>`
      : "";
  $("#extract").textContent = c ? "✕ HỦY HỒI HOÀN" : "⟡ HỒI HOÀN";
  $("#shop").style.borderColor = match.nearShop() ? "#dec186" : "";
  $("#seal").classList.toggle(
    "hidden",
    !(
      match.region(a) === 6 &&
      match.time >= 600 &&
      match.time < 840 &&
      match.seals < 2
    ),
  );
  const next = [300, 600, 900, 1200].find((t) => t > match.time);
  $("#gateBanner").textContent = match.gates.some((g) => g.end > match.time)
    ? `CỔNG ĐANG MỞ · ${Math.ceil(Math.max(...match.gates.map((g) => g.end)) - match.time)}s`
    : next && next - match.time < 60
      ? `CẢNH BÁO: CỔNG MỞ SAU ${Math.ceil(next - match.time)}s`
      : match.time > 480
        ? "HỒN CHƯỚNG ĐANG XÂM THỰC NGOẠI VI"
        : "SĂN HỒN THÚ · THU THẬP CHIẾN LỢI PHẨM";
  const portal = $("#realmPortal");
  if (portal) {
    portal.classList.toggle("hidden", !match.portalAction());
    portal.textContent = match.player.realm ? "THOÁT BÍ CẢNH" : "VÀO BÍ CẢNH";
  }
  drawMap();
}
function drawMap() {
  const canvas = $("#minimap");
  if (!canvas) return;
  const ctx = canvas.getContext("2d"),
    a = match.player,
    scale = 1.4,
    to = (p) => ({ x: (p.x + 100) * scale, z: (p.z + 100) * scale });
  ctx.fillStyle = "#16343c";
  ctx.fillRect(0, 0, 280, 280);
  for (let i = 0; i < 7; i++) {
    const r = REGIONS[i],
      p = to(r);
    ctx.fillStyle = "#" + r.color.toString(16);
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(p.x, p.z, i === 6 ? 23 : 49, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (match.time > 480 + i * 100 && i < 5) {
      ctx.fillStyle = "#a768965f";
      ctx.beginPath();
      ctx.arc(p.x, p.z, 49, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#d0dfca";
    ctx.font = "10px Arial";
    ctx.fillText(String(i + 1), p.x - 2, p.z - 22);
  }
  ctx.strokeStyle = "#bfd1ad25";
  for (let i = 0; i < 280; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 280);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(280, i);
    ctx.stroke();
  }
  function dot(o, color, r = 2) {
    const p = to(o);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.z, r, 0, 7);
    ctx.fill();
  }
  match.shopPoints.forEach((p) => dot(p, "#edc87e", 3));
  match.merchants.forEach((p) => dot(p, "#f4e3b1", 2));
  match.shrines.forEach((p) => dot(p, "#bd9fff", 3));
  match.gates.forEach((g) => {
    const p = to(g);
    ctx.strokeStyle = g.end > match.time ? "#9bffce" : "#60746d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.z, 6, 0, 7);
    ctx.stroke();
  });
  const next = [300, 600, 900].find((t) => t > match.time);
  if (next && next - match.time <= 60)
    GATE_POS.forEach((g) => dot(g, "#a4ddae", 3));
  for (const t of match.actors)
    if (t.alive && !t.extracted && (!match.visible || match.visible(a, t))) {
      if (
        t.kind === "hero" &&
        (t.team === 0 ||
          R.distance(t, a) < 19 ||
          t.revealUntil > match.time ||
          a.scanUntil > match.time)
      )
        dot(t, t.team === 0 ? "#8beac9" : "#e88c85", t === a ? 4 : 2);
      if (t.kind === "boss") dot(t, "#f5a260", 4);
      if (t.kind === "beast" && t.tier && a.beastScanUntil > match.time)
        dot(t, "#dd91ff", 2);
      if (t.wantedUntil > match.time && (t.wantedUntil - match.time) % 15 < 1) {
        const p = to(REGIONS[match.region(t)]);
        ctx.strokeStyle = "#f29eae";
        ctx.beginPath();
        ctx.arc(p.x, p.z, 32, 0, 7);
        ctx.stroke();
      }
    }
  if (a.treasureScanUntil > match.time)
    match.drops.forEach((d) => {
      if (R.distance(d, a) < 90) dot(d, "#efdd93", 2);
    });
  for (const warning of match.warnings ?? []) {
    const p = to(REGIONS[warning.region]);
    ctx.strokeStyle = "#f29eae";
    ctx.beginPath();
    ctx.arc(p.x, p.z, warning.radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  const marker =
    a.goalMarker ?? (a.pathUntil > match.time ? match.gates[0] : null);
  if (marker) {
    const p = to(a),
      q = to(marker);
    ctx.strokeStyle = "#ffe1a0";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.z);
    if (a.pathUntil > match.time && a.safePath?.length) {
      for (const waypoint of a.safePath) {
        const node = to(waypoint);
        ctx.lineTo(node.x, node.z);
      }
    } else ctx.lineTo(q.x, q.z);
    ctx.stroke();
    ctx.setLineDash([]);
    dot(marker, "#ffe1a0", 4);
  }
}
function fullscreen() {
  guarded(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    screen.orientation?.lock?.("landscape").catch(() => {});
  });
}
$("#rotatePlay").onclick = () => {
  $("#rotate").classList.add("dismissed");
  fullscreen();
};
window.addEventListener("keydown", (e) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (!match || match.result) return;
  if (e.code === "Escape") {
    closeModal();
    return;
  }
  if (modal || e.repeat) return;
  keys.add(e.code);
  if (["KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(e.code))
    autoFarm.manualStart("key:" + e.code);
  if (
    ["KeyQ", "KeyE", "KeyR", "KeyF"].includes(e.code) ||
    (e.code === "KeyW" && e.shiftKey)
  ) {
    autoFarm.manualStart("keyboard-skill");
    autoFarm.manualEnd("keyboard-skill");
  }
  if (e.code === "KeyQ") skillshot.requestCast(0, mouseAim ?? undefined);
  if (e.code === "KeyW" && e.shiftKey) {
    keys.delete("KeyW");
    skillshot.requestCast(1, mouseAim ?? undefined);
  }
  if (e.code === "KeyE") skillshot.requestCast(2, mouseAim ?? undefined);
  if (e.code === "KeyR") skillshot.requestCast(3, mouseAim ?? undefined);
  if (e.code === "KeyF") skillshot.requestCast(4, null);
  if (["Digit1", "Digit2", "Digit3"].includes(e.code))
    guarded(() => match.useSupport(+e.code.at(-1) - 1));
  if (e.code === "KeyG") match.pickup();
  if (e.code === "KeyB") showShop();
  if (e.code === "KeyI") showBag();
  pushInputEdge();
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  autoFarm.manualEnd("key:" + e.code);
  pushInputEdge();
});
window.addEventListener("blur", () => {
  releaseJoystick();
  skillshot.reset();
  for (const id of [...autoFarm.pointers]) autoFarm.manualEnd(id);
  keys.clear();
  input.attack = false;
  input.x = input.z = 0;
  pushInputEdge();
});
let mouseAim = null;
window.addEventListener("pointermove", (e) => {
  if (match && e.pointerType === "mouse" && e.target === $("#world")) {
    const p = world.screenToWorld(e.clientX, e.clientY),
      dx = p.x - match.player.x,
      dz = p.z - match.player.z,
      n = Math.hypot(dx, dz);
    if (n > 0.01) mouseAim = { x: dx / n, z: dz / n };
  }
});
let last = performance.now(),
  uiAcc = 0,
  saveAcc = 0,
  frames = 0,
  fpsTimer = 0;
function animate(now) {
  const frameMs=now-last;
  const dt = Math.max(0, Math.min(0.1, frameMs / 1000));
  world?.samplePerformance?.(frameMs);
  last = now;
  animationId=requestAnimationFrame(animate);
  if (match && match.player && !paused && !match.result) {
    if (
      !modal &&
      mouseAim &&
      !skillshot.active &&
      (autoFarm.mode === "off" || autoFarm.status().manualPaused)
    )
      match.player.dir = mouseAim;
    ensureRuntimeSecurity(match);
    if (!modal) {
      autoFarm.update(dt);
      skillshot.update(dt);
    }
    match.step(dt, controlInput());
  }
  saveAcc += dt;
  if (saveAcc >= 5) {
    saveAcc = 0;
    if (match && !match.result && !match.online) save();
  }
  if (world&&(!match || match.player)) world.render(match, dt, loadout.hero, loadout);
  updateAssetLoadingIndicator();
  updateAutoHUD();
  audio.update(match, now / 1000);
  updateSkillCooldowns();
  uiAcc += dt;
  frames++;
  fpsTimer += frameMs/1000;
  if (uiAcc > 0.1) {
    uiAcc = 0;
    updateHUD();
  }
  if (fpsTimer > 1) {
    if ($("#performance"))
      $("#performance").textContent =
        `${world?.backend==='worker'?world.renderMetrics.fps:Math.round(frames / fpsTimer)} FPS · ${world?.renderer.info.render.calls??0} draws`;
    fpsTimer = 0;
    frames = 0;
  }
}
// Offline snapshots stay pending until an explicit trusted gesture.
async function continueOfflineMatch(event){
 const token=lifecycle.begin(event);if(token===null)return false;app.inert=true;
 try{
  if(onlineAccount||!pendingSnapshot)throw Error('Không có snapshot ngoại tuyến đầy đủ để tiếp tục.');
  const restored=Match.restore(pendingSnapshot,offlineMatchEvent);
  if(restored.result||!restored.player?.alive)throw Error('Trận lưu đã kết thúc. Hãy xử lý bản ghi cũ trước.');
  const p=restored.player,appearance={...loadout,hero:p.hero,branch:p.branch,rings:[...p.rings],bones:[...p.bones],skin:p.skin??0,costume:p.costume??0,ranked:p.ranked??false,mode:({1:'solo',2:'duo',3:'squad3',4:'squad4'})[restored.teamSize]??loadout.mode,supports:p.supports.map(({id,tier})=>({id,tier}))};
  await worldReady;if(!lifecycle.valid(token))return false;await world.prepareBattlefield(appearance);if(!lifecycle.valid(token))return false;
  restored.profile=profile;world.reset();match=restored;loadout=appearance;lifecycle.enter(token);match.performanceTiering=true;match.obstacles=world.obstacles;
  pendingSnapshot=pendingRun=null;paused=false;renderHUD();save();toast('Đã tiếp tục trận ngoại tuyến theo yêu cầu.');return true;
 }catch(error){world?.releaseBattlefield();lifecycle.cancel();throw error;}finally{app.inert=false;}
}
function offlineMatchEvent(type,data){if(type==='message')toast(data);if(type==='hit')audio.hit();if(type==='save')save();if(type==='sendPanel')showSend();if(type==='end')setTimeout(showResult,50);}
function showInterruptedRunConfirmation(){
 showModal('Trận ngoại tuyến đang dở',`<p class="intro">${pendingSnapshot?'Có snapshot đầy đủ: bạn có thể tiếp tục bằng nút ở sảnh.':'Bản lưu v3 chỉ có biên nhận tài sản, không đủ vị trí/bot/timer để tiếp tục nguyên trận.'} Bỏ trận chỉ diễn ra khi bạn xác nhận, theo luật tử vong hiện có.</p><button id="confirmAbandonOffline" class="danger">XÁC NHẬN BỎ TRẬN DỞ</button>`,()=>{$('#confirmAbandonOffline').onclick=event=>guarded(()=>{if(!event.isTrusted)return false;
  let player;
  if(pendingRun)player={...pendingRun,bag:[],gear:[...(pendingRun.gear??[]),...(pendingRun.escrow??[])]};
  else if(pendingSnapshot){const stored=Match.restore(pendingSnapshot);if(!stored.result&&stored.player?.alive){stored.cancelExtraction(stored.player);player=stored.player;}}
  const next=structuredClone(profile);
  if(player){const result=R.deathSettlement(player);next.tb+=result.refund;next.stash.push(...result.saved);next.matches++;next.record.unshift({title:'Xác nhận bỏ trận ngoại tuyến',value:0,kills:player.kills??0,time:Date.now()});next.record=next.record.slice(0,10);}
  clearOfflineSave(localStorage,next);profile=next;pendingSnapshot=pendingRun=null;closeModal();renderHub();
 });});
}
lifecycle.boot();renderHub();bootMetrics.marks.lobbyUI=performance.now();
worldReady=initializeWorld().catch(error=>{bootMetrics.error=error.message;toast('Không khởi tạo được 3D. Giao diện và kho vẫn khả dụng.');throw error;});
// Attach rejection handling immediately even before the user presses Start.
void worldReady.catch(()=>{});
let recoveringRenderer=false;
window.addEventListener('hon-gioi-render-error',async()=>{
 if(recoveringRenderer)return;recoveringRenderer=true;
 try{
  if(match?.online&&!match.result)match.kill();else if(match&&!match.result){match.player.downedUntil=1;match.kill(match.player,{team:-1,kind:'beast'});}
  if(match)backHub();world?.dispose?.();world=undefined;
  const canvas=$('#world'),replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);
  toast('Đang khôi phục đồ họa…');worldReady=initializeWorld({forceMain:true});await worldReady;
 }catch(error){toast(error.message);}finally{recoveringRenderer=false;}
});
window.addEventListener('pagehide',save);
let animationId=null,backgroundMatch=false;
function suspend(){save();backgroundMatch=!!match;if(lifecycle.phase===PHASES.LOADING){lifecycle.cancel();world?.releaseBattlefield();renderHub();}if(animationId!==null)cancelAnimationFrame(animationId);animationId=null;releaseJoystick();skillshot.reset();keys.clear();input.x=input.z=0;input.attack=false;}
function resume(){
 if(backgroundMatch&&match){
  if(!match.online&&!match.result){
   if(save()){pendingSnapshot=match.snapshot();pendingRun=null;match=null;lifecycle.cleanup();cleanupWorldForLobby();modal=null;paused=false;closeModal();renderHub();}
  }else{if(match.online&&!match.result)match.kill();backHub();}
 }
 backgroundMatch=false;last=performance.now();if(animationId===null)animationId=requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>document.hidden?suspend():resume());
window.addEventListener('hon-gioi-native-pause',suspend);
window.addEventListener('hon-gioi-native-resume',()=>{if(match)backgroundMatch=true;resume();});
window.addEventListener('pageshow',event=>{if(event.persisted)resume();});
animationId=requestAnimationFrame(animate);
// Service worker ownership belongs to boot.js; native APKs read their packaged assets directly.
// Read-only diagnostics for QA; game state remains available for local sandbox automation.
window.__HON_GIOI__ = {
  get build(){return{sourceHash:bootMetrics.sourceHash,version:"2.5.0"};},
  get lifecycle(){return {phase:lifecycle.phase,revision:lifecycle.revision,transitions:[...lifecycle.transitions]};},
  get boot(){return bootMetrics;},
  get match() {
    return match;
  },
  get profile() {
    return profile;
  },
  get loadout() {
    return loadout;
  },
  get world() {
    return world;
  },
  get controls() {
    return {
      leftJoystickPointerId: skillshot.leftJoystickPointerId,
      rightSkillPointerId: skillshot.rightSkillPointerId,
      queued: skillshot.skillBufferQueue.length,
      aiming: !!skillshot.active,
    };
  },
  autoFarm: Object.freeze({ status: () => autoFarm.status() }),
  debug,
  assets: masterworkAssets,
  security: securityFacade(() => match),
  ...(import.meta.env.DEV
    ? {
        sandbox(fn) {
          if (match?.online) throw Error("Sandbox chỉ dành cho offline DEV");
          return ensureRuntimeSecurity(match).sandbox(fn);
        },
      }
    : {}),
};

async function showOnline() {
  showModal(
    "Tài khoản máy chủ",
    `<p class="intro">Ví/kho online độc lập với tài khoản mẫu ngoại tuyến. Ranked cần tối thiểu60 tài khoản đang ghép trận và không thêm bot. Máy chủ quyết định sát thương, vị trí và giao dịch.</p><div class="stack"><input id="serverOrigin" placeholder="Địa chỉ máy chủ HTTPS (để trống dùng máy chủ hiện tại)" aria-label="Máy chủ"><input id="accountName" placeholder="Tên tài khoản (3–24 ký tự)" autocomplete="username"><input id="accountPassword" type="password" placeholder="Mật khẩu (10+ ký tự)" autocomplete="current-password"><div class="row"><button id="registerOnline">Đăng ký</button><button id="loginOnline" class="primary">Đăng nhập</button><button id="offlineMode">Chơi ngoại tuyến</button></div></div>`,
    () => {
      const credentials = () => {
        configureServer($("#serverOrigin").value);
        return {
          username: $("#accountName").value,
          password: $("#accountPassword").value,
        };
      };
      $("#registerOnline").onclick = async () => {
        try {
          await api("/auth/register", credentials());
          toast("Tạo tài khoản thành công. Hãy đăng nhập.");
        } catch (e) {
          toast(e.message);
        }
      };
      $("#loginOnline").onclick = async () => {
        try {
          await api("/auth/login", credentials());
          const me = await api("/me");
          profile = me.profile;
          onlineAccount = true;
          sanitizeLoadout();
          closeModal();
          renderHub();
        } catch (e) {
          toast(e.message);
        }
      };
      $("#offlineMode").onclick = async () => {
        await api("/auth/logout", {}).catch(() => {});
        onlineAccount = false;
        profile =
          JSON.parse(localStorage.getItem("hon-gioi-save-v2"))?.profile ??
          R.newProfile();
        sanitizeLoadout();
        closeModal();
        renderHub();
      };
    },
  );
}
async function startOnline(token) {
  try {
    R.validateLoadout(loadout);
    const q = await api("/queue", { loadout });
    world.reset();
    closeModal();
    showModal(
      "Ghép trận trực tuyến",
      `<p class="intro">${q.status === "waiting" ? "Đang chờ đủ tối thiểu60 người thật cho Ranked." : "Đang kết nối trận đấu..."} Không đóng cửa sổ này nếu muốn tiếp tục ghép.</p>`,
    );
    match = new RemoteMatch(async (type, data) => {
      if (type === "message") toast(data);
      if (type === "hit") audio.hit();
      if (type === "waiting") {
        const intro = $(".modal .intro");
        if (intro)
          intro.textContent = `Ranked: ${data.players}/${data.required} tài khoản đang chờ.`;
      }
      if (type === "connected") {
        if(!lifecycle.enter(token)){match?.close();return;}
        closeModal();
        renderHUD();
      }
      if (type === "sendPanel") showSend();
      if (type === "end") {
        try {
          profile = (await api("/me")).profile;
        } catch {}
        showResult();
      }
    });
  } catch (e) {
    toast(e.message);
  }
}
