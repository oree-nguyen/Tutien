import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { HEROES, RINGS, BONES, REGIONS, COSTUMES, WEAPONS } from "../../src/data.js";
import { HERO_APPEARANCE } from "../../src/hero-anatomy.js";
import { SOUL_WEAPON_SPEC } from "../../src/weapons.js";

// Inventory only. Importing these tables does not build replacement geometry.
const assets = [];
const hex = n => "#" + n.toString(16).padStart(6, "0");
const finish = ", isolated complete object, entire silhouette visible with ample white margins, clean solid white background, Oriental fantasy xianxia game art, real PBR material, no text, no watermark";
const styles = {
  scholar: "elegant scholar robes with embroidered spirit vines and lotus",
  mountain: "powerful mountain warrior with layered angular stone armor",
  fox: "agile female fox assassin with crescent details and fox-tail accessories",
  thunder: "male lightning cultivator with embroidered cranes and layered feather robes",
  moon: "serene female moon cultivator with cloud and crane silk embroidery",
  turtle: "massive male guardian with hexagonal turtle-shell armor",
  fire: "male flame cultivator with red lotus petal layered robes",
  ice: "female ice cultivator with crystal butterfly details and long silver-white hair",
  ranger: "female moon archer with a short layered mantle and star embroidery",
  tiger: "male armored tiger warrior with tiger-head relief armor",
  music: "female celestial musician with orchid and cloud-embroidered silk robes",
  snake: "male void-serpent cultivator with purple snake-scale collar and long robes",
};
function add(a) {
  assets.push({ status: "pending", runtimeInstalled: false, ...a, prompt: a.prompt + finish });
}
for (const [i, hero] of HEROES.entries()) {
  const look = HERO_APPEARANCE[i];
  for (let costume = 0; costume < COSTUMES[i].length; costume++) {
    const extras = ["base original outfit", "travel mantle and layered shoulder drape", "ceremonial layered chest/shoulder armor and crown details", "festival outfit with embroidered flowers and small jewel ornaments"][costume];
    add({ id: `${hero.id}-C${costume}`, category: "hero", hero: i, costume,
      name: `${hero.name} — ${COSTUMES[i][costume]}`, source: ["src/data.js:COSTUMES", "src/hero-anatomy.js:HERO_APPEARANCE/buildAnatomy"],
      soul: hero.soul, element: hero.element, heightMeters: look.height,
      assembly: { body: true, weaponSeparate: true, boneSockets: 7, botReuse: true },
      prompt: `Orthographic front view, complete full body adult ${look.gender} character reference, strict A-pose with both empty hands and arms straight diagonally down 35 degrees away from torso, feet apart, both shoes fully visible, no cropping, figure occupies 70 percent of image. ${styles[look.style]}, ${extras}, outer clothing ${hex(look.outer)}, inner clothing ${hex(look.inner)}, embroidered trim ${hex(look.gold)}, hair ${hex(look.hair)}, eyes ${look.eye}. No weapon, no held prop, no mirror, no gesture`,
    });
  }
  for (let skin = 0; skin < 3; skin++) {
    const weapon = SOUL_WEAPON_SPEC[i];
    add({ id: `${hero.id}-W${skin}`, category: "weapon", hero: i, skin,
      name: `${weapon.name} — ${["nguyên bản", "Cơ bản", "VIP"][skin]}`,
      source: ["src/weapons.js:SOUL_WEAPON_SPEC/makeTemplate/skinOrnaments", "src/data.js:WEAPONS"],
      sourceNameDifference: WEAPONS[i] !== weapon.name ? WEAPONS[i] : null,
      weapon, prompt: `${weapon.name}, ${weapon.weaponType.replaceAll("-", " ")}, ${weapon.handedness === "paired" ? "matching pair displayed separately with clear gap" : "one isolated artifact"}, ${JSON.stringify(weapon)}, ${["original carved elemental design", "celestial silver-gold jewelry and gemstones", "imperial gold crown fittings, lotus flame filigree and jade gemstones"][skin]}, no person, no hands`,
    });
  }
}
for (const ring of RINGS) add({id:ring.code, category:"soul-ring", name:ring.name, source:["src/data.js:RINGS", "src/soul-ring-vfx.js:buildSlot"], ring,
  prompt:`One complete flat circular soul ring artifact ${ring.name}, ${ring.black ? "obsidian black with violet luminous inlaid ancient runes" : "translucent purple jade with silver luminous ancient runes"}, fine engraved outer and inner bands, open center, intrinsic glow, no person`});
const boneLooks = ["jade and gold forehead circlet with spirit-eye gem", "layered jade heart-protecting chest plate", "one anatomical left armored forearm bracer", "one anatomical right lightning rune forearm bracer", "one anatomical left wind rune greave", "one anatomical right earth rune greave", "eight separate articulated spider spear limbs radiating from a compact back harness, back-worn artifact"];
for (const [i,bone] of BONES.entries()) add({id:`HB-${String(bone.id).padStart(2,"0")}`,category:i===6?"external-bone":"bone",name:bone.name,source:["src/data.js:BONES", "src/simulation.js:createHero/bones"],slot:bone.slot,
  prompt:`${bone.name}, ${boneLooks[i]}, separate wearable soul-bone artifact, no person, no mannequin, no body inside`});
const fauna = [
  ["wolf","Thanh Phong Lang","agile four-legged green wind spirit wolf with layered fur, distinct thighs and lower legs"],
  ["rhino","Nham Giáp Tê","massive four-legged rhinoceros with layered rock armor, engraved stone cracks and large horn"],
  ["firebird","Hỏa Linh Điểu","small fire phoenix, gold crest, twelve layered feathers on each spread wing and three long flame tail ribbons"],
  ["icebutterfly","Hàn Băng Điệp","large ice butterfly, open curved translucent blue-white crystal wings with engraved veins"],
  ["ape","Thái Nhạc Cự Viên","towering muscular stone-armored giant ape, large articulated hands, ancient gold rock engravings"],
  ["kirin","Lôi Diễm Kỳ Lân","four-legged celestial kirin, branching antlers, gold scales, lightning mane and flame tail"],
  ["dragon","Hư Không Cổ Long","complete long void dragon with two articulated wings, four clawed legs, horned head and long curled tail"],
];
for (const [species,name,description] of fauna) {
  add({id:`CREATURE-${species}`,category:["ape","kirin","dragon"].includes(species)?"boss":"beast",name,species,source:["src/creature-art.js:buildCreatureVisual",`src/creature-art.js:build${species}`],prompt:`${description}, full body reference with all limbs visible and separated from body, no ground plinth`});
  if (!["ape","kirin","dragon"].includes(species)) add({id:`CREATURE-${species}-mutant`,category:"mutant-beast",name:name+" — Biến Dị",species,source:["src/creature-art.js:addMutant"],prompt:`Mutated ${description}, additional horns and intrinsic glowing elemental veins, full body with limbs separated and visible, no ground plinth`});
}
const props = [
  ["sanctuary-dais","Bệ xuất chiến bạch ngọc","three-tier round white jade ceremonial dais with carved cloud relief and gilded rims","createSanctuary"],
  ["sanctuary-pillar","Trụ rồng sảnh","one tall jade pillar with a carved gold dragon coiled around it, dragon head and small lamp crown","createSanctuary"],
  ["sanctuary-arch","Cổng vòm sảnh","large carved jade and gold semicircular arch with two complete side posts","createSanctuary"],
  ["mountain-backdrop","Núi nền sảnh","one rocky ancient mountain peak with mist-worn ridges, no sky or clouds","createSanctuary"],
  ["portal-base","Đế Cổng Hồi Hoàn","three-tier octagonal stone portal base, carved yin-yang and ancient glyph relief","createPortal"],
  ["portal-pillar","Trụ Cổng Hồi Hoàn","one curved stone dragon pillar engraved with Sanskrit-like runes, curved inward near the top","createPortal"],
  ["portal-ring","Vành Cổng Hồi Hoàn","one large complete bronze spatial portal ring, carved gold ancient rune bands, open empty center","createPortal"],
  ["portal-lamp","Đèn Cổng Hồi Hoàn","one jade stone and gold carved spirit-fire brazier with an open bowl","createPortal"],
  ["shop-pavilion","Đình Đài Giao Dịch","complete eight-column Chinese pavilion with curved glazed green roof, red gold timber columns, no people","createShop"],
  ["shop-lantern","Đèn lồng giao dịch","one hanging red silk lantern with gold endcaps and tassel","lantern"],
  ["shop-cauldron","Lò luyện đan","one engraved bronze three-legged alchemy cauldron with ornate handles and open bowl","createShop"],
  ["shop-signboard","Biển giao dịch","one wooden gold-edged hanging signboard with carved cloud relief, no readable text","createShop"],
  ["altar-base","Tế Đàn Hồn Hoàn","nine-sided ancient stone altar with nine carved channels converging on a central crystal pedestal","createAltar"],
  ["altar-crystal","Huyết Tinh Thạch","one floating red faceted soul crystal with a carved gold setting","createAltar"],
  ["central-plaza","Đài Bát Quái trung tâm","flat circular white jade plaza with carved eight-trigram inlaid gold channels and concentric cloud relief","createScenery"],
  ["forest-tree","Cây cổ lâm","one complete ancient jade-green broadleaf tree with exposed curved roots, tall branching trunk and dense layered canopy","createScenery"],
  ["snow-tree","Cây tuyết","one complete snow-covered alpine spirit pine with visible brown trunk and branching foliage","createScenery"],
  ["dead-tree","Cây độc trạch","one twisted bare dead tree with purple-black damp bark and exposed roots","createScenery"],
  ["rock-cluster","Cụm đá","one cluster of irregular gray-gold slate rocks with natural rough faces and moss cracks","createScenery"],
  ["void-crystal","Tinh thể hư không","one cluster of tall irregular violet crystals growing out of dark stone","createScenery"],
  ["nav-monolith","Chướng ngại cổ thạch","one tall carved irregular stone monolith with three inset ancient rune bands","createScenery"],
  ["grass-patch","Bụi cỏ ẩn thân","one small rooted patch of curved fine jade-green grass blades, no pot, no ground square","createScenery"],
  ["spirit-flower","Linh thảo","one small rooted jade spirit flower cluster with luminous blossoms and detailed leaves","createScenery"],
  ["ore","Quặng linh kim","one rough gray stone ore cluster with exposed sparkling gold veins","createScenery"],
  ["lava-column","Cột đá núi lửa","one fractured dark volcanic rock column with intrinsic orange lava cracks","createScenery"],
  ["hidden-island","Đảo Bí Cảnh","one complete floating dark crystalline island, rocky underside and flat irregular upper surface","createScenery"],
  ["hidden-crystal","Tinh thể đảo Bí Cảnh","one large dark violet irregular crystal formation","createScenery"],
  ["petal","Cánh hoa sảnh","one curled pink silk-like flower petal, thin detailed translucent edges","createSanctuary"],
  ["poison-bubble","Bọt độc","one translucent purple poison bubble with iridescent wet surface, isolated","createScenery"],
];
for (const [id,name,prompt,fn] of props) add({id:`ENV-${id}`,category:"environment-prop",name,source:[`src/scenery.js:${fn}`],prompt});
for (const [i,region] of REGIONS.entries()) add({id:`ENV-terrain-${i+1}`,category:"terrain",name:region.name,source:["src/scenery.js:createScenery/sceneryTerrainHeight", "src/data.js:REGIONS"],requiresAuthoritativeHeightAndSeamValidation:true,prompt:`One complete flat-edged square terrain tile for ${region.name}, ${["dark jade grass, exposed roots and small spirit flowers","rough gray gold slate with ore veins","wet black purple swamp mud and luminous mushrooms","white snow with cracked blue ice","fractured black volcanic stone with orange lava cracks","white jade paving with engraved cloud dragon and gold inlay","violet crystalline void stone"][i]}, detailed surface relief, no buildings, no characters`});
for (const [id,name,description] of [
  ["companion","Hồn Linh đồng hành","small floating jade-blue spirit creature with detailed translucent body and luminous markings"],
  ["loot-container","Vật chứa chiến lợi phẩm","small carved gold and jade loot casket, complete closed box with ornate lock"],
]) add({id:`WORLD-${id}`,category:"world-prop",name,source:[`src/world.js:${id==="companion"?"renderCompanion":"renderDrops"}`],prompt:description});
// Shader-bearing visible 3D carriers are included rather than silently exempted.
for (const hero of HEROES) add({id:`VFX-${hero.id}-projectile`,category:"effect-carrier",name:`Đạn ${hero.element}`,source:["src/world.js:renderProjectiles/spawnParticles", "src/environment-vfx.js"],prompt:`One small solid ${hero.element} elemental projectile spirit shard, engraved intrinsic glow, no smoke background`});
for (const [id,name,prompt] of [["water","Mặt nước độc","one thin flat translucent purple reflective water tile"],["lava","Mặt dung nham","one flat fractured glowing orange lava tile"],["ice","Mặt băng","one thin cracked translucent blue ice tile"]]) add({id:`ENV-liquid-${id}`,category:"shader-surface",name,source:["src/scenery.js:ribbonSurface/liquidMaterial"],prompt});

const sourceAudit=[];
for (const file of (await readdir("src")).filter(n=>n.endsWith(".js"))) {
  const path="src/"+file,code=await readFile(path,"utf8");
  for (const m of code.matchAll(/new\s+(?:(?:THREE|T)\.)?([A-Za-z]+Geometry)\s*\(/g)) {
    const prefix=code.slice(0,m.index),line=prefix.split("\n").length;
    const declarations=[...prefix.matchAll(/(?:export\s+)?function\s+(\w+)\s*\(/g)];
    sourceAudit.push({path,line,geometry:m[1],nearestFunction:declarations.at(-1)?.[1]??"module-or-class",status:"not-replaced",action:"Audit exact model versus HUD/indicator/particle render surface before removing; no blanket completion claim"});
  }
}
const sourceFiles=["src/data.js","src/hero-anatomy.js","src/weapons.js","src/creature-art.js","src/scenery.js","src/world.js","src/soul-ring-vfx.js"];
const sourceHashes=await Promise.all(sourceFiles.map(async path=>({path,sha256:createHash("sha256").update(await readFile(path)).digest("hex")})));
const legacyGLBs=[];
async function scanLegacy(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const path=dir+"/"+entry.name;
    if(entry.isDirectory())await scanLegacy(path);
    else if(entry.name.endsWith(".glb")) {
      const bytes=await readFile(path);
      const digest=createHash("sha256").update(bytes).digest("hex");
      let trial=false;
      if(path.startsWith("public/models/h01-c0/")) {
        const receipt=JSON.parse(await readFile("public/models/h01-c0/provenance.json","utf8"));
        trial=receipt.levels.some(level=>level.file===entry.name&&level.sha256===digest);
      }
      legacyGLBs.push({path,bytes:bytes.length,sha256:digest,status:trial?"hunyuan-user-shared-static-trial":"legacy-not-Tencent-not-replaced",...(trial?{assetId:"H01-C0"}:{})});
    }
  }
}
await scanLegacy("public");
const report={version:1,scope:"All declared visual archetypes/variants plus textual source Geometry constructor audit and legacy GLB files. Repeated bots/scene instances reuse these assets; not one generation per instance. Actual replacement remains unverified until runtime/visual checks.",sourceHashes,counts:Object.fromEntries([...new Set(assets.map(a=>a.category))].map(c=>[c,assets.filter(a=>a.category===c).length])),total:assets.length,assets,sourceGeometryAudit:sourceAudit,legacyGLBs,notes:["48 body/costume assets include the 12 base heroes; 36 weapon assets include 12 originals and 24 skins. Their combinations are assembled, not counted as separately generated characters.","H06 is Đỗ Kình and H11 is Ninh Từ in the source; preserve IDs when matching user abbreviations Kính/Tư.","The six equipment bone items were gameplay data without independent visible models; their new attachments must be integrated and tested, not falsely reported as existing geometry.","Terrain, water, VFX carriers and HUD Geometry calls are explicitly inventoried; generated terrain cannot silently alter collision coordinates.","Boss four is not invented; three Boss definitions remain the original scope."]};
await mkdir("assets/tencent",{recursive:true});
await writeFile("assets/tencent/catalog.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({total:report.total,counts:report.counts,geometrySites:sourceAudit.length}));
