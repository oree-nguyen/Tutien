import {bakedUiAssetUrls} from './baked-ui-assets.js';
import {
  HEROES,
  SKILLS,
  ITEMS,
  SUPPORTS,
  RINGS,
  BONES,
  WEAPONS,
} from "./data.js";

// All artwork is painted from paths. DOM/canvas access is deferred until requested.
const TAU = Math.PI * 2;
const ELEMENTS = [
  "#45efab",
  "#f8ac45",
  "#cf86ff",
  "#60cfff",
  "#fff2a5",
  "#42cbbb",
  "#ff714c",
  "#9aeaff",
  "#b8a1ff",
  "#ffd36a",
  "#8af4df",
  "#b776ff",
];
const ELEMENT_NAMES = {
  Mộc: 0,
  Thổ: 1,
  Phong: 2,
  Lôi: 3,
  Quang: 4,
  Thủy: 5,
  Hỏa: 6,
  Băng: 7,
  Ám: 8,
  Kim: 9,
  "Âm Luật": 10,
  Âm: 10,
  Độc: 11,
};
const resolveElement = (value) =>
  typeof value === "number"
    ? `#${value.toString(16).padStart(6, "0")}`
    : ELEMENT_NAMES[value] !== undefined
      ? ELEMENTS[ELEMENT_NAMES[value]]
      : value;
const TYPE_ALIASES = {
  BP: "item",
  SUP: "support",
  HR: "ring",
  HB: "bone",
  supplement: "item",
  soulring: "ring",
  soulbone: "bone",
  skin: "skin",
  equipment: "weapon",
};
const ITEM_SHAPES = [
  "pill",
  "pill",
  "talisman",
  "crystal",
  "pill",
  "pearl",
  "crystal",
  "seal",
  "pill",
  "crystal",
  "jade",
  "seal",
  "talisman",
  "pill",
  "pearl",
  "bell",
  "seal",
  "crystal",
  "pearl",
  "seal",
  "bottle",
  "pearl",
  "pill",
  "jade",
  "compass",
  "pearl",
  "talisman",
  "compass",
];
const ITEM_COLORS = [
  "#f47749",
  "#e83662",
  "#7ee8cf",
  "#ffad45",
  "#49b9ff",
  "#a68cff",
  "#7ee1eb",
  "#8ab6ff",
  "#edbb63",
  "#a4c0d3",
  "#c0f7eb",
  "#ebca74",
  "#78e1ff",
  "#6ee6b5",
  "#aa82e4",
  "#c5ebff",
  "#9bc578",
  "#8ee9ff",
  "#c4a47b",
  "#ffd370",
  "#79e9a0",
  "#ffe3a0",
  "#fff1cc",
  "#ffcb7f",
  "#edc994",
  "#b7abbf",
  "#b59bff",
  "#ffdf8b",
];
const RING_MOTIFS = [
  "vine",
  "flame",
  "lotus",
  "hammer",
  "wind",
  "lightning",
  "mirror",
  "shield",
  "snow",
  "arrow",
  "tiger",
  "snake",
];
const SUPPORT_MOTIFS = [
  "lock",
  "eye",
  "parasite",
  "treasure",
  "dome",
  "mirror",
  "compass",
  "mist",
  "chain",
  "seal",
  "lotus",
  "path",
  "heart",
  "leaf",
  "treasure",
  "wave",
  "portal",
  "hourglass",
];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const numberId = (id) => Number(String(id).match(/\d+/)?.[0] ?? id) || 1;
function normalize(type, id) {
  const prefix = String(type).toUpperCase();
  return {
    type:
      TYPE_ALIASES[type] ?? TYPE_ALIASES[prefix] ?? String(type).toLowerCase(),
    id: numberId(id),
  };
}
function seeded(seed) {
  let v = seed >>> 0;
  return () => {
    v = Math.imul(v ^ (v >>> 15), 1 | v);
    v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
function path(c, points, close = true) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
}
function ellipse(c, x, y, rx, ry, fill, stroke, width = 2, angle = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, angle, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function line(c, points, color, width = 4, glow = 0) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = c.lineJoin = "round";
  c.shadowColor = color;
  c.shadowBlur = glow;
  path(c, points, false);
  c.stroke();
  c.restore();
}
function fillPath(c, points, fill, stroke = "#f6e6b1", width = 2) {
  path(c, points);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function metal(c, x1 = 110, y1 = 100, x2 = 375, y2 = 390, pale = false) {
  const g = c.createLinearGradient(x1, y1, x2, y2);
  [
    [0, pale ? "#f7fbff" : "#fff2bb"],
    [0.2, pale ? "#7f9baa" : "#b28038"],
    [0.43, pale ? "#e4f2f6" : "#ffe3a1"],
    [0.58, pale ? "#527180" : "#7b4d24"],
    [0.8, pale ? "#d5eaf1" : "#dfb25e"],
    [1, "#304957"],
  ].forEach(([p, v]) => g.addColorStop(p, v));
  return g;
}
function gem(c, x, y, r, color, sides = 6) {
  const points = Array.from({ length: sides }, (_, i) => [
    x + Math.sin((i * TAU) / sides) * r,
    y + Math.cos((i * TAU) / sides) * r,
  ]);
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r * 1.3);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.2, color);
  g.addColorStop(1, "#111b35");
  fillPath(c, points, g, "#d7f4ef", 2);
  points.forEach(([px, py], i) => {
    if (i % 2 === 0)
      line(
        c,
        [
          [x - r * 0.1, y + r * 0.13],
          [px, py],
        ],
        "#ffffff60",
        1.2,
      );
  });
  ellipse(
    c,
    x - r * 0.24,
    y - r * 0.33,
    r * 0.15,
    r * 0.06,
    "#fffef9bd",
    null,
    1,
    -0.5,
  );
}
function petal(c, x, y, angle, length, width, color) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const g = c.createLinearGradient(0, 0, 0, -length);
  g.addColorStop(0, "#173d45");
  g.addColorStop(0.48, color);
  g.addColorStop(1, "#f2fff4");
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(
    -width,
    -length * 0.3,
    -width * 0.35,
    -length * 0.9,
    0,
    -length,
  );
  c.bezierCurveTo(width * 0.5, -length * 0.8, width, -length * 0.3, 0, 0);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = "#e9f9d4b0";
  c.lineWidth = 1.8;
  c.stroke();
  line(
    c,
    [
      [0, -6],
      [0, -length * 0.85],
    ],
    "#f4ffd58c",
    1.2,
  );
  c.restore();
}
function wings(c, x, y, color, span = 105) {
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      petal(
        c,
        x + side * 8,
        y + i * 6,
        side * (1 + i * 0.1),
        span - i * 6,
        17,
        color,
      );
    }
}
function shield(c, x, y, r, color) {
  c.save();
  c.translate(x, y);
  c.scale(r / 90, r / 90);
  fillPath(
    c,
    [
      [0, -101],
      [76, -66],
      [66, 35],
      [38, 80],
      [0, 108],
      [-38, 80],
      [-66, 35],
      [-76, -66],
    ],
    metal(c),
    "#fff0ae",
    4,
  );
  fillPath(
    c,
    [
      [0, -80],
      [56, -52],
      [48, 29],
      [0, 85],
      [-48, 29],
      [-56, -52],
    ],
    "#193d45",
    color,
    3,
  );
  for (const side of [-1, 1])
    for (let j = 0; j < 3; j++)
      line(
        c,
        [
          [0, -40 + j * 34],
          [side * 35, -22 + j * 20],
        ],
        "#ebd59c",
        2,
      );
  gem(c, 0, 0, 28, color, 6);
  c.restore();
}
function lightning(c, x, y, color, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.shadowColor = color;
  c.shadowBlur = 20;
  fillPath(
    c,
    [
      [29, -116],
      [-65, 7],
      [-13, 7],
      [-43, 119],
      [78, -29],
      [21, -29],
    ],
    "#f2fbff",
    color,
    5,
  );
  c.restore();
}
function flame(c, x, y, color, r = 100) {
  c.save();
  c.translate(x, y);
  c.scale(r / 100, r / 100);
  const g = c.createLinearGradient(0, -120, 0, 90);
  g.addColorStop(0, "#fff4c7");
  g.addColorStop(0.38, color);
  g.addColorStop(1, "#56243d");
  c.beginPath();
  c.moveTo(0, 95);
  c.bezierCurveTo(-118, 56, -93, -29, -61, -73);
  c.bezierCurveTo(-63, -13, -37, -16, -24, -53);
  c.bezierCurveTo(5, -103, 30, -81, 17, -137);
  c.bezierCurveTo(98, -78, 107, 53, 0, 95);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = "#ffe3b6";
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.moveTo(0, 71);
  c.bezierCurveTo(-49, 28, -28, -2, 6, -44);
  c.bezierCurveTo(-5, 10, 49, 39, 0, 71);
  c.fillStyle = "#fff3b8";
  c.fill();
  c.restore();
}
function lotus(c, x, y, color, r = 80, petals = 10) {
  for (let i = 0; i < petals; i++)
    petal(c, x, y + 20, (i * TAU) / petals, r, r * 0.32, color);
  gem(c, x, y + 10, r * 0.27, "#f3f6bd", 8);
}
function vine(c, x, y, color, variant = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.45 + variant * 0.18);
  c.beginPath();
  c.moveTo(-88, 105);
  c.bezierCurveTo(105, 65, -110, -16, 61, -115);
  c.strokeStyle = "#133a31";
  c.lineWidth = 19;
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = 10;
  c.stroke();
  c.strokeStyle = "#e7ffbd";
  c.lineWidth = 2;
  c.stroke();
  for (let i = 0; i < 7; i++) {
    const py = 85 - i * 28,
      px = Math.sin(i * 1.4) * 28;
    petal(c, px, py, (i % 2 ? 1 : -1) * 0.9, 53, 16, color);
  }
  c.restore();
}
function hammer(c, x, y, color, scale = 1) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.55);
  c.scale(scale, scale);
  fillPath(
    c,
    [
      [-12, -15],
      [13, -15],
      [19, 135],
      [-19, 135],
    ],
    metal(c),
    "#c49e60",
    3,
  );
  for (let j = 0; j < 9; j++)
    line(
      c,
      [
        [-15, 32 + j * 10],
        [15, 22 + j * 10],
      ],
      "#3d2937",
      4,
    );
  fillPath(
    c,
    [
      [-100, -91],
      [-73, -122],
      [77, -122],
      [105, -90],
      [105, -12],
      [75, 17],
      [-75, 17],
      [-100, -13],
    ],
    metal(c),
    "#ffe0a4",
    4,
  );
  fillPath(
    c,
    [
      [-70, -88],
      [65, -88],
      [65, -13],
      [-70, -13],
    ],
    "#293440",
    color,
    3,
  );
  line(
    c,
    [
      [-60, -60],
      [-30, -77],
      [-12, -47],
      [8, -55],
      [39, -21],
      [57, -35],
    ],
    color,
    5,
    15,
  );
  gem(c, 0, -60, 22, color);
  c.restore();
}
function bow(c, x, y, color) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.45);
  c.beginPath();
  c.moveTo(55, -131);
  c.bezierCurveTo(-145, -75, -139, 85, 55, 131);
  c.strokeStyle = metal(c);
  c.lineWidth = 17;
  c.stroke();
  line(
    c,
    [
      [55, -131],
      [11, 0],
      [55, 131],
    ],
    "#f6f1ce",
    2,
    9,
  );
  line(
    c,
    [
      [-130, 0],
      [130, 0],
    ],
    color,
    8,
    15,
  );
  fillPath(
    c,
    [
      [147, 0],
      [105, -18],
      [110, 18],
    ],
    metal(c),
  );
  for (const side of [-1, 1])
    petal(c, -10, side * 75, side > 0 ? 2.6 : 0.5, 74, 14, color);
  c.restore();
}
function mirror(c, x, y, color, r = 85) {
  ellipse(c, x, y, r, r * 1.18, metal(c), "#fff3ce", 4);
  ellipse(c, x, y, r - 13, (r - 13) * 1.18, "#152b49", color, 4);
  const g = c.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, "#c6f9ff");
  g.addColorStop(0.25, "#7c77c9");
  g.addColorStop(0.5, "#e0e3ff");
  g.addColorStop(0.7, "#4e7b9a");
  g.addColorStop(1, "#192747");
  ellipse(c, x, y, r - 21, (r - 21) * 1.18, g, null);
  line(
    c,
    [
      [x - r * 0.45, y + r * 0.35],
      [x + r * 0.35, y - r * 0.7],
    ],
    "#ffffefb0",
    8,
  );
  for (let j = 0; j < 8; j++) {
    const a = (j * TAU) / 8;
    gem(
      c,
      x + Math.cos(a) * (r + 2),
      y + Math.sin(a) * (r + 2) * 1.18,
      6,
      color,
      4,
    );
  }
}
function snow(c, x, y, color, r = 100) {
  for (let j = 0; j < 6; j++) {
    const a = (j * TAU) / 6;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    line(
      c,
      [
        [0, 0],
        [0, -r],
      ],
      "#eafaff",
      7,
      12,
    );
    for (const d of [45, 70])
      line(
        c,
        [
          [-20, -d - 17],
          [0, -d],
          [20, -d - 17],
        ],
        color,
        4,
      );
    c.restore();
  }
  gem(c, x, y, 27, color, 6);
}
function snake(c, x, y, color, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.beginPath();
  c.moveTo(-84, 104);
  c.bezierCurveTo(102, 104, 103, 18, -16, 14);
  c.bezierCurveTo(-105, 11, -79, -101, 28, -94);
  c.bezierCurveTo(59, -88, 76, -64, 60, -48);
  c.strokeStyle = "#172a35";
  c.lineWidth = 37;
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = 22;
  c.stroke();
  c.strokeStyle = "#eff2ce";
  c.lineWidth = 3;
  c.stroke();
  fillPath(
    c,
    [
      [46, -68],
      [89, -82],
      [106, -47],
      [74, -31],
      [45, -42],
    ],
    metal(c),
    color,
    4,
  );
  gem(c, 79, -58, 7, "#ff9d7a", 4);
  line(
    c,
    [
      [98, -41],
      [123, -26],
      [135, -32],
    ],
    "#ff7b90",
    2,
  );
  c.restore();
}
function tiger(c, x, y, color) {
  c.save();
  c.translate(x, y);
  fillPath(
    c,
    [
      [-87, -58],
      [-98, -124],
      [-39, -91],
      [0, -110],
      [40, -91],
      [98, -124],
      [87, -58],
      [99, 22],
      [55, 91],
      [0, 111],
      [-55, 91],
      [-99, 22],
    ],
    metal(c),
    color,
    4,
  );
  for (const s of [-1, 1]) {
    fillPath(
      c,
      [
        [s * 15, -20],
        [s * 69, -41],
        [s * 53, -7],
      ],
      "#172e36",
      color,
      2,
    );
    line(
      c,
      [
        [s * 83, 10],
        [s * 49, 19],
        [s * 74, 34],
      ],
      "#3f3542",
      8,
    );
    line(
      c,
      [
        [s * 36, -76],
        [s * 21, -47],
        [s * 8, -70],
      ],
      "#554552",
      7,
    );
  }
  fillPath(
    c,
    [
      [-20, 35],
      [20, 35],
      [0, 57],
    ],
    "#3b253c",
    null,
  );
  line(
    c,
    [
      [-30, 76],
      [0, 66],
      [30, 76],
    ],
    "#fff4da",
    5,
  );
  c.restore();
}
function motif(
  c,
  name,
  x = 256,
  y = 258,
  color = "#a2f5d2",
  scale = 1,
  variant = 0,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  x = 0;
  y = 0;
  if (name === "vine") vine(c, 0, 0, color, variant);
  else if (name === "flame") flame(c, 0, 0, color);
  else if (name === "lotus") lotus(c, 0, 0, color, 99, 12);
  else if (name === "hammer") hammer(c, 0, 0, color);
  else if (name === "lightning") lightning(c, 0, 0, color);
  else if (name === "shield" || name === "dome") {
    shield(c, 0, 0, 95, color);
    if (name === "dome") ellipse(c, 0, 0, 135, 130, null, color, 5);
  } else if (name === "mirror") mirror(c, 0, 0, color);
  else if (name === "snow") snow(c, 0, 0, color);
  else if (name === "arrow") bow(c, 0, 0, color);
  else if (name === "tiger") tiger(c, 0, 0, color);
  else if (name === "snake") snake(c, 0, 0, color);
  else if (name === "wind" || name === "wave" || name === "mist")
    for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.moveTo(-110, 65 - j * 34);
      c.bezierCurveTo(-30, 88 - j * 37, 111, 13 - j * 34, 53, -34 - j * 15);
      c.bezierCurveTo(26, -49 - j * 15, 5, -28 - j * 15, 24, -20 - j * 15);
      c.strokeStyle = color;
      c.lineWidth = 12 - j * 2;
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.stroke();
    }
  else if (name === "eye") {
    c.beginPath();
    c.moveTo(-119, 0);
    c.quadraticCurveTo(0, -110, 119, 0);
    c.quadraticCurveTo(0, 110, -119, 0);
    c.fillStyle = "#e9fff0";
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 8;
    c.stroke();
    gem(c, 0, 0, 45, color, 16);
    ellipse(c, 0, 0, 13, 27, "#102636");
    for (let i = 0; i < 3; i++)
      ellipse(c, 0, 0, 145 + i * 18, 101 + i * 14, null, color + "70", 2);
  } else if (name === "portal") {
    ellipse(c, 0, 0, 79, 121, "#14233e", color, 12);
    ellipse(c, 0, 0, 56, 99, null, "#eaf8f4", 2);
    for (let j = 0; j < 7; j++)
      line(
        c,
        [
          [-102, 40 + j * 8],
          [-24, 11 + j * 7],
          [50, 16 + j * 4],
        ],
        color,
        2,
      );
    fillPath(
      c,
      [
        [-39, 26],
        [20, 8],
        [59, 31],
        [1, 55],
      ],
      metal(c),
      "#ffffce",
      2,
    );
    fillPath(
      c,
      [
        [-39, 26],
        [-39, 67],
        [1, 87],
        [1, 55],
      ],
      "#7a653d",
    );
    fillPath(
      c,
      [
        [1, 55],
        [59, 31],
        [59, 70],
        [1, 87],
      ],
      "#c9aa62",
    );
  } else if (name === "hourglass") {
    fillPath(
      c,
      [
        [-70, -117],
        [70, -117],
        [64, -78],
        [11, 0],
        [62, 79],
        [70, 117],
        [-70, 117],
        [-62, 79],
        [-11, 0],
        [-64, -78],
      ],
      "#9abfc84d",
      color,
      4,
    );
    for (const yy of [-122, 122])
      fillPath(
        c,
        [
          [-90, yy - 9],
          [90, yy - 9],
          [90, yy + 9],
          [-90, yy + 9],
        ],
        metal(c),
      );
    fillPath(
      c,
      [
        [-48, -71],
        [48, -71],
        [0, -3],
      ],
      "#f6d98b",
      null,
    );
    fillPath(
      c,
      [
        [-48, 89],
        [48, 89],
        [0, 27],
      ],
      "#f6d98b",
      null,
    );
    lightning(c, 52, -5, color, 0.55);
  } else if (name === "lock") {
    shield(c, 0, 0, 110, color);
    ellipse(c, 0, -17, 28, 34, null, "#f6e3ae", 13);
    fillPath(
      c,
      [
        [-44, -5],
        [44, -5],
        [44, 58],
        [-44, 58],
      ],
      metal(c),
    );
    gem(c, 0, 20, 13, color, 4);
  } else if (name === "heart") {
    c.beginPath();
    c.moveTo(0, 98);
    c.bezierCurveTo(-160, -4, -87, -118, 0, -51);
    c.bezierCurveTo(87, -118, 160, -4, 0, 98);
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = "#f7f0bc";
    c.lineWidth = 5;
    c.stroke();
    line(
      c,
      [
        [-86, 0],
        [-38, 0],
        [-17, -35],
        [5, 34],
        [25, -9],
        [83, -9],
      ],
      "#fffde8",
      5,
      12,
    );
  } else if (name === "treasure") {
    fillPath(
      c,
      [
        [-105, -35],
        [100, -35],
        [108, 78],
        [-105, 78],
      ],
      metal(c),
    );
    fillPath(
      c,
      [
        [-105, -35],
        [-75, -88],
        [74, -88],
        [100, -35],
      ],
      "#b97743",
      color,
      3,
    );
    for (let j = 0; j < 7; j++)
      gem(
        c,
        -76 + j * 25,
        -52 + (j % 2) * -18,
        20,
        [color, "#d18cff", "#fff1a5"][j % 3],
        6,
      );
    fillPath(
      c,
      [
        [-15, -15],
        [18, -15],
        [18, 37],
        [-15, 37],
      ],
      "#fff0ab",
    );
  } else if (name === "chain") {
    for (let j = 0; j < 6; j++)
      ellipse(
        c,
        -85 + j * 34,
        -65 + j * 25,
        29,
        18,
        null,
        metal(c),
        10,
        j % 2 ? 0.9 : -0.4,
      );
    lightning(c, 21, -5, color, 0.8);
  } else if (name === "leaf") {
    lotus(c, 0, 20, color, 105, 7);
    line(
      c,
      [
        [-80, 68],
        [80, -78],
      ],
      "#ffffdf",
      4,
    );
  } else if (name === "parasite") {
    for (let i = 0; i < 7; i++) petal(c, 0, 25, (i * TAU) / 7, 120, 15, color);
    vine(c, 0, 0, color);
  } else if (name === "path") {
    for (let j = 0; j < 4; j++)
      fillPath(
        c,
        [
          [-29, 70 - j * 55],
          [0, 42 - j * 55],
          [29, 70 - j * 55],
          [0, 59 - j * 55],
        ],
        color,
        null,
      );
    wings(c, 0, 60, color, 65);
  } else if (name === "compass") {
    for (let r = 105; r > 60; r -= 18)
      ellipse(c, 0, 0, r, r, null, metal(c), 6);
    for (let j = 0; j < 8; j++) {
      c.save();
      c.rotate((j * Math.PI) / 4);
      fillPath(
        c,
        [
          [0, -112],
          [-13, -39],
          [0, -56],
          [13, -39],
        ],
        j % 2 ? color : metal(c),
        "#ffffd0",
        1,
      );
      c.restore();
    }
    gem(c, 0, 0, 24, color, 8);
  } else {
    shield(c, 0, 0, 88, color);
    gem(c, 0, -8, 38, color, 5 + (variant % 4));
  }
  c.restore();
}
function background(c, rarity, color, seed) {
  const tier = Number(rarity) || 2,
    pal =
      tier >= 3
        ? ["#2d101d", "#b45e2b", "#ffe5a0"]
        : tier === 2
          ? ["#111d3b", "#604795", "#e6c788"]
          : ["#072b29", "#17665d", "#c3d7d5"];
  const g = c.createRadialGradient(256, 222, 20, 256, 256, 350);
  g.addColorStop(0, pal[1]);
  g.addColorStop(0.47, pal[0]);
  g.addColorStop(1, "#050f20");
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 512);
  c.save();
  c.translate(256, 256);
  c.globalAlpha = 0.23;
  c.strokeStyle = pal[2];
  c.lineWidth = 2;
  for (const radius of [126, 175, 198, 218]) {
    ellipse(c, 0, 0, radius, radius, null, pal[2], radius === 198 ? 5 : 1.5);
  }
  for (let j = 0; j < 8; j++) {
    c.save();
    c.rotate((j * Math.PI) / 4);
    line(
      c,
      [
        [-23, -187],
        [23, -187],
      ],
      pal[2],
      5,
    );
    line(
      c,
      [
        [-23, -178],
        [-4, -178],
      ],
      pal[2],
      5,
    );
    line(
      c,
      [
        [5, -178],
        [23, -178],
      ],
      pal[2],
      5,
    );
    line(
      c,
      [
        [-23, -169],
        [23, -169],
      ],
      pal[2],
      5,
    );
    c.restore();
  }
  c.restore();
  const rand = seeded(seed);
  for (let j = 0; j < 58; j++) {
    const a = rand() * TAU,
      r = 90 + rand() * 138,
      x = 256 + Math.cos(a) * r,
      y = 256 + Math.sin(a) * r;
    c.globalAlpha = 0.2 + rand() * 0.65;
    ellipse(c, x, y, 1 + rand() * 2, 1 + rand() * 2, j % 3 ? color : "#fff9cb");
  }
  c.globalAlpha = 1;
  // Engraved octagonal metal frame with independent bevel bands and corner leaves.
  const outline = [
    [60, 17],
    [452, 17],
    [495, 60],
    [495, 452],
    [452, 495],
    [60, 495],
    [17, 452],
    [17, 60],
  ];
  path(c, outline);
  c.strokeStyle = metal(c);
  c.lineWidth = 17;
  c.stroke();
  path(
    c,
    outline.map(([x, y]) => [256 + (x - 256) * 0.966, 256 + (y - 256) * 0.966]),
  );
  c.strokeStyle = "#fff6d499";
  c.lineWidth = 2;
  c.stroke();
  for (const [x, y, a] of [
    [46, 46, -0.8],
    [466, 46, 0.8],
    [466, 466, 2.3],
    [46, 466, -2.3],
  ]) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    for (let i = 0; i < 3; i++) petal(c, 0, i * 12, 0, 36, 11, pal[2]);
    c.restore();
  }
}
function drawBone(c, id, color) {
  if (id === 1) {
    fillPath(
      c,
      [
        [128, 317],
        [106, 179],
        [175, 222],
        [216, 129],
        [256, 205],
        [302, 126],
        [339, 222],
        [407, 179],
        [384, 317],
      ],
      metal(c, 0, 0, 450, 440, true),
      "#f9f5dd",
      4,
    );
    for (let i = 0; i < 5; i++) gem(c, 154 + i * 51, 285, 14, color, 4);
    motif(c, "eye", 256, 249, color, 0.42);
  }
  if (id === 2) {
    for (const s of [-1, 1])
      for (let j = 0; j < 5; j++) {
        c.beginPath();
        c.moveTo(256, 151 + j * 38);
        c.bezierCurveTo(
          256 + s * 143,
          122 + j * 34,
          256 + s * 133,
          183 + j * 29,
          256 + s * 25,
          190 + j * 34,
        );
        c.strokeStyle = metal(c);
        c.lineWidth = 15 - j;
        c.stroke();
      }
    line(
      c,
      [
        [256, 136],
        [256, 392],
      ],
      "#d2aa66",
      15,
    );
    motif(c, "heart", 256, 255, color, 0.57);
    ellipse(c, 256, 257, 130, 144, null, color + "88", 3);
  }
  if (id === 3 || id === 4) {
    c.save();
    c.translate(256, 257);
    c.rotate(id === 3 ? -0.5 : 0.45);
    fillPath(
      c,
      [
        [-67, 122],
        [-73, -10],
        [-49, -63],
        [46, -63],
        [73, -10],
        [67, 122],
      ],
      metal(c, 0, 0, 300, 300, id === 4),
      color,
      4,
    );
    for (let j = 0; j < 5; j++) {
      const x = -64 + j * 30;
      fillPath(
        c,
        [
          [x, -10],
          [x - 13, -103 - (j % 2) * 20],
          [x + 1, -145 + (j % 2) * 15],
          [x + 16, -107],
          [x + 12, -10],
        ],
        "#33465b",
        color,
        3,
      );
    }
    for (let j = 0; j < 3; j++)
      line(
        c,
        [
          [-56, 48 + j * 21],
          [56, 48 + j * 21],
        ],
        "#efe7bd",
        3,
      );
    gem(c, 0, 27, 29, color, 6);
    if (id === 4) for (const x of [-84, 65]) lightning(c, x, 0, color, 0.55);
    c.restore();
  }
  if (id === 5 || id === 6) {
    c.save();
    c.translate(249, 245);
    c.rotate(-0.35);
    fillPath(
      c,
      [
        [-36, -123],
        [51, -123],
        [55, 37],
        [101, 93],
        [110, 131],
        [-65, 131],
        [-70, 87],
        [-38, 32],
      ],
      metal(c),
      color,
      4,
    );
    for (let j = 0; j < 5; j++)
      line(
        c,
        [
          [-38, -91 + j * 28],
          [46, -79 + j * 28],
        ],
        "#7a5839",
        4,
      );
    fillPath(
      c,
      [
        [-68, 109],
        [105, 109],
        [110, 134],
        [-68, 134],
      ],
      "#1c3543",
      color,
      3,
    );
    gem(c, 1, -12, 30, color, 6);
    if (id === 5) wings(c, 0, -35, color, 84);
    else {
      for (const yy of [85, 119])
        ellipse(c, 5, yy, 143, 35, null, color + "a0", 4);
    }
    c.restore();
  }
  if (id === 7) {
    for (const s of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const yy = 173 + j * 47;
        fillPath(
          c,
          [
            [249, 248],
            [256 + s * 87, yy - 48],
            [256 + s * (152 - j * 5), yy - 59],
            [256 + s * (180 - j * 7), yy + 32],
            [256 + s * 137, yy - 27],
            [256 + s * 77, yy - 16],
            [263, 269],
          ],
          metal(c, 0, 0, 400, 400, true),
          color,
          3,
        );
      }
    gem(c, 256, 255, 56, color, 8);
    for (let j = 0; j < 4; j++) ellipse(c, 238 + j * 12, 248, 4, 9, "#ffe5d2");
  }
}
function drawRing(c, id, color) {
  for (let j = 0; j < 3; j++) {
    const r = 116 + j * 31;
    ellipse(
      c,
      256,
      256,
      r,
      r,
      null,
      j === 1 ? "#e6d6f7" : color,
      j === 1 ? 5 : 8,
    );
  }
  for (let i = 0; i < 24; i++) {
    c.save();
    c.translate(256, 256);
    c.rotate((i * TAU) / 24);
    line(
      c,
      [
        [-6, -158],
        [2, -149],
        [7, -160],
        [11, -151],
      ],
      "#fff0d1",
      2,
    );
    c.restore();
  }
  motif(c, RING_MOTIFS[id - 1], 256, 256, color, 0.68);
  if (id === 1 || id === 2)
    for (let j = 0; j < 7; j++)
      petal(
        c,
        256 + Math.cos(j * 0.9) * 150,
        256 + Math.sin(j * 0.9) * 150,
        j * 0.9 + 0.5,
        39,
        12,
        "#7fea9b",
      );
}
function drawItem(c, id, color) {
  const kind = ITEM_SHAPES[id - 1];
  if (kind === "pill" || kind === "pearl") {
    const g = c.createRadialGradient(224, 200, 10, 256, 256, 122);
    g.addColorStop(0, "#fff5e5");
    g.addColorStop(0.23, color);
    g.addColorStop(0.75, color);
    g.addColorStop(1, "#1a223b");
    ellipse(c, 256, 256, 103, kind === "pill" ? 98 : 110, g, "#eaf6d7", 3);
    for (let i = 0; i < 5; i++) {
      c.save();
      c.translate(256, 256);
      c.rotate(i * 1.3 + id * 0.25);
      c.beginPath();
      c.moveTo(8, -85);
      c.bezierCurveTo(75, -34, -38, 63, 18, 91);
      c.strokeStyle = "#f4edbf90";
      c.lineWidth = 2;
      c.stroke();
      c.restore();
    }
    ellipse(c, 222, 216, 28, 12, "#fff7e480", null, 1, -0.5);
    if (id === 1)
      line(
        c,
        [
          [245, 160],
          [267, 211],
          [245, 238],
          [279, 284],
          [261, 350],
        ],
        "#ffd08a",
        6,
        12,
      );
    if (id === 15)
      for (const s of [-1, 1])
        ellipse(c, 256 + s * 115, 263, 43, 68, "#ae88e42c", color + "40", 2);
    if (id === 26) motif(c, "mist", 256, 256, color, 1.25);
  } else if (kind === "talisman") {
    c.save();
    c.translate(256, 251);
    c.rotate(-0.18 + (id % 3) * 0.12);
    fillPath(
      c,
      [
        [-85, -140],
        [83, -129],
        [73, 113],
        [44, 144],
        [15, 121],
        [-18, 145],
        [-72, 120],
      ],
      metal(c),
      color,
      4,
    );
    fillPath(
      c,
      [
        [-66, -114],
        [63, -108],
        [54, 102],
        [-54, 105],
      ],
      "#284858",
      color,
      2,
    );
    motif(
      c,
      id === 3 ? "wind" : id === 13 ? "path" : "lightning",
      0,
      -1,
      color,
      0.65,
    );
    for (let j = 0; j < 3; j++)
      line(
        c,
        [
          [-39, 93 + j * 11],
          [42, 93 + j * 11],
        ],
        "#f2d58b",
        2,
      );
    c.restore();
  } else if (kind === "crystal") {
    for (let j = 0; j < 5; j++) {
      const a = (j - 2) * 0.47;
      gem(
        c,
        256 + Math.sin(a) * 75,
        270 + Math.abs(j - 2) * 17,
        80 - Math.abs(j - 2) * 19,
        color,
        j % 2 ? 5 : 6,
      );
    }
    if (id === 7)
      for (let j = 0; j < 4; j++)
        gem(
          c,
          256 + Math.cos((j * TAU) / 4) * 120,
          253 + Math.sin((j * TAU) / 4) * 120,
          24,
          ELEMENTS[j * 3],
          5,
        );
    if (id === 18) snow(c, 256, 256, color, 92);
  } else if (kind === "seal") {
    fillPath(
      c,
      [
        [126, 277],
        [259, 228],
        [391, 277],
        [259, 330],
      ],
      metal(c),
      "#fff4c4",
      3,
    );
    fillPath(
      c,
      [
        [126, 277],
        [259, 330],
        [259, 375],
        [126, 321],
      ],
      "#8d623b",
      color,
      3,
    );
    fillPath(
      c,
      [
        [259, 330],
        [391, 277],
        [391, 321],
        [259, 375],
      ],
      "#dfb972",
      color,
      3,
    );
    motif(
      c,
      id === 12 ? "shield" : id === 20 ? "chain" : id === 17 ? "vine" : "tiger",
      256,
      213,
      color,
      0.61,
    );
  } else if (kind === "jade") {
    fillPath(
      c,
      [
        [202, 142],
        [309, 142],
        [348, 225],
        [320, 338],
        [256, 380],
        [191, 338],
        [162, 225],
      ],
      "#1b6872",
      color,
      4,
    );
    for (let j = 0; j < 4; j++)
      ellipse(c, 256, 251, 43 + j * 12, 65 + j * 14, null, color + "9a", 2);
    motif(c, id === 24 ? "flame" : "lotus", 256, 257, color, 0.65);
    line(
      c,
      [
        [256, 145],
        [256, 105],
        [287, 90],
      ],
      "#f8d78f",
      5,
    );
    for (const s of [-1, 1])
      for (let j = 0; j < 5; j++)
        line(
          c,
          [
            [256 + s * 23, 347],
            [256 + s * (30 + j * 7), 399],
          ],
          color,
          3,
        );
  } else if (kind === "bottle") {
    c.save();
    c.translate(250, 255);
    c.rotate(-0.28);
    c.beginPath();
    c.moveTo(-34, -128);
    c.lineTo(36, -128);
    c.lineTo(28, -70);
    c.bezierCurveTo(115, -7, 100, 116, 0, 125);
    c.bezierCurveTo(-100, 116, -115, -7, -28, -70);
    c.closePath();
    const g = c.createLinearGradient(-70, 0, 90, 0);
    g.addColorStop(0, "#235e66");
    g.addColorStop(0.4, "#d1fff0");
    g.addColorStop(0.7, color);
    g.addColorStop(1, "#1b5961");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "#eaffd1";
    c.lineWidth = 3;
    c.stroke();
    for (const yy of [-122, -105])
      line(
        c,
        [
          [-39, yy],
          [38, yy],
        ],
        "#e9c987",
        8,
      );
    motif(c, "lotus", 0, 29, color, 0.5);
    c.restore();
    gem(c, 361, 307, 27, color, 5);
  } else if (kind === "bell") {
    wings(c, 256, 212, color, 118);
    c.beginPath();
    c.moveTo(203, 151);
    c.bezierCurveTo(166, 207, 195, 282, 145, 316);
    c.lineTo(368, 316);
    c.bezierCurveTo(317, 281, 347, 208, 309, 151);
    c.closePath();
    c.fillStyle = metal(c);
    c.fill();
    c.strokeStyle = "#ffedbf";
    c.lineWidth = 3;
    c.stroke();
    ellipse(c, 256, 319, 111, 24, "#473b36", color, 4);
    gem(c, 256, 290, 26, color, 6);
    ellipse(c, 256, 133, 20, 20, null, "#eed6a0", 8);
  } else {
    motif(c, "compass", 256, 256, color, 1.2);
    if (id === 28) {
      const stars = [
        [-80, -44],
        [-49, -23],
        [-18, -30],
        [13, 2],
        [60, 8],
        [81, 47],
        [108, 73],
      ];
      line(
        c,
        stars.map(([x, y]) => [256 + x, 256 + y]),
        "#ffe6a3",
        3,
        12,
      );
      stars.forEach(([x, y]) => gem(c, 256 + x, 256 + y, 8, "#fffbe1", 4));
    }
  }
  if (id % 4 === 0)
    for (let j = 0; j < 2; j++) {
      c.save();
      c.translate(256, 256);
      c.rotate(j * Math.PI);
      c.beginPath();
      c.moveTo(-140, 99);
      c.bezierCurveTo(-200, -10, -126, -154, -26, -145);
      c.strokeStyle = "#ffc56c";
      c.lineWidth = 5;
      c.stroke();
      c.restore();
    }
}
function drawSupport(c, id, color) {
  if (id >= 17) {
    motif(c, SUPPORT_MOTIFS[id - 1], 256, 256, color, 1.15);
    return;
  }
  c.save();
  c.translate(256, 260);
  c.rotate(-0.11 + (id % 3) * 0.09);
  fillPath(
    c,
    [
      [-110, -151],
      [97, -145],
      [110, 123],
      [77, 151],
      [43, 123],
      [8, 151],
      [-25, 123],
      [-68, 151],
      [-103, 127],
    ],
    metal(c),
    "#ffe9b9",
    3,
  );
  fillPath(
    c,
    [
      [-91, -127],
      [79, -121],
      [91, 107],
      [-86, 111],
    ],
    "#142d43",
    color,
    3,
  );
  motif(c, SUPPORT_MOTIFS[id - 1], 0, -3, color, 0.67, id);
  for (let j = 0; j < 3; j++) {
    line(
      c,
      [
        [-60, -106 + j * 12],
        [-31, -106 + j * 12],
        [-18, -96 + j * 12],
      ],
      "#f0d28a",
      2,
    );
    line(
      c,
      [
        [26, 85 + j * 9],
        [58, 85 + j * 9],
      ],
      "#f0d28a",
      2,
    );
  }
  c.restore();
}
function drawWeapon(c, id, color, skin = 0) {
  if (id === 1) {
    c.save();
    c.translate(256, 260);
    c.rotate(0.4);
    for (let j = 0; j < 3; j++) {
      c.beginPath();
      c.moveTo(Math.sin(j * 2) * 12, 160);
      for (let y = 150; y > -95; y -= 9)
        c.lineTo(Math.sin(y * 0.045 + j * 2) * 17, y);
      c.strokeStyle = j === 1 ? "#e0c18b" : "#6c7652";
      c.lineWidth = 9;
      c.stroke();
    }
    lotus(c, 0, -112, color, 67, 12);
    for (const s of [-1, 1]) petal(c, s * 8, -59, s * 1.1, 70, 15, color);
    c.restore();
  }
  if (id === 2) hammer(c, 256, 246, color, 1.16);
  if (id === 3) {
    for (const s of [-1, 1]) {
      c.save();
      c.translate(256 + s * 65, 245);
      c.rotate(s * 0.5);
      c.beginPath();
      c.moveTo(-14, 128);
      c.lineTo(15, 128);
      c.lineTo(9, 13);
      c.bezierCurveTo(119, -7, 112, -131, 5, -151);
      c.bezierCurveTo(60, -82, 69, -41, -13, -17);
      c.closePath();
      c.fillStyle = metal(c, 0, 0, 300, 300, true);
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = 4;
      c.stroke();
      line(
        c,
        [
          [-25, 20],
          [29, 20],
        ],
        "#f0cda5",
        9,
      );
      c.restore();
    }
  }
  if (id === 4) {
    c.save();
    c.translate(256, 330);
    for (let j = 0; j < 9; j++) petal(c, 0, 0, (j - 4) * 0.25, 213, 28, color);
    gem(c, 0, 0, 37, color, 9);
    c.restore();
    lightning(c, 256, 224, color, 0.45);
  }
  if (id === 5) mirror(c, 256, 256, color, 120);
  if (id === 6) shield(c, 256, 256, 134, color);
  if (id === 7) {
    line(
      c,
      [
        [263, 390],
        [250, 139],
      ],
      metal(c),
      20,
    );
    lotus(c, 255, 194, color, 109, 12);
    flame(c, 256, 180, color, 61);
  }
  if (id === 8) {
    for (const s of [-1, 1]) {
      petal(c, 256, 256, s * 0.65, 175, 78, color);
      petal(c, 256, 256, s * 2.25, 120, 66, color);
    }
    gem(c, 256, 256, 44, color, 6);
    snow(c, 256, 256, color, 88);
  }
  if (id === 9) bow(c, 256, 256, color);
  if (id === 10) {
    for (const s of [-1, 1]) {
      c.save();
      c.translate(256 + s * 72, 266);
      c.rotate(s * 0.25);
      shield(c, 0, 25, 70, color);
      for (let j = 0; j < 3; j++)
        fillPath(
          c,
          [
            [-42 + j * 36, -9],
            [-38 + j * 36, -131],
            [-19 + j * 36, -170],
            [-17 + j * 36, -12],
          ],
          metal(c, 0, 0, 300, 300, true),
          color,
          3,
        );
      c.restore();
    }
  }
  if (id === 11) {
    c.save();
    c.translate(256, 256);
    c.rotate(-0.52);
    fillPath(
      c,
      [
        [-69, -165],
        [62, -165],
        [78, 151],
        [45, 172],
        [-58, 161],
      ],
      metal(c),
      color,
      4,
    );
    fillPath(
      c,
      [
        [-49, -138],
        [44, -138],
        [57, 132],
        [-43, 138],
      ],
      "#35504f",
      color,
      2,
    );
    for (let j = 0; j < 7; j++)
      line(
        c,
        [
          [-32 + j * 11, -130],
          [-28 + j * 11, 132],
        ],
        "#fff0c7",
        1.6,
      );
    for (const yy of [-99, 108])
      line(
        c,
        [
          [-47, yy],
          [51, yy],
        ],
        "#d8bd83",
        6,
      );
    c.restore();
  }
  if (id === 12) {
    line(
      c,
      [
        [215, 392],
        [274, 122],
      ],
      metal(c),
      21,
    );
    snake(c, 266, 222, color, 0.9);
    gem(c, 282, 115, 37, color, 5);
  }
  if (skin) {
    for (let j = 0; j < (skin === 2 ? 12 : 6); j++) {
      const a = (j * TAU) / (skin === 2 ? 12 : 6);
      gem(
        c,
        256 + Math.cos(a) * 177,
        256 + Math.sin(a) * 177,
        skin === 2 ? 10 : 6,
        skin === 2 ? "#ffdc8a" : color,
        4,
      );
    }
    if (skin === 2) {
      for (const s of [-1, 1]) wings(c, 256 + s * 85, 348, color, 59);
    }
  }
}
function drawSkill(c, hero, slot, color) {
  c.save();
  c.translate(256, 256);
  c.rotate((slot - 1.5) * 0.11);
  c.translate(-256, -256);
  if (hero === 0) {
    if (slot === 0) vine(c, 256, 256, color);
    if (slot === 1) {
      for (let j = 0; j < 5; j++)
        vine(c, 162 + j * 46, 305 - (j % 2) * 29, color, j - 2);
    }
    if (slot === 2) {
      for (let j = 0; j < 6; j++)
        petal(
          c,
          174 + j * 33,
          344 - (j % 2) * 32,
          (j - 2) * 0.2,
          146,
          24,
          color,
        );
      lotus(c, 256, 270, color, 71, 8);
    }
    if (slot === 3) {
      for (let j = 0; j < 6; j++) {
        c.beginPath();
        c.moveTo(137 + j * 47, 367);
        c.quadraticCurveTo(113 + j * 50, 180, 256, 125);
        c.strokeStyle = color;
        c.lineWidth = 9;
        c.stroke();
      }
      ellipse(c, 256, 358, 142, 36, null, "#f0ffcb", 5);
    }
  } else if (hero === 1) {
    if (slot === 0) hammer(c, 249, 244, color, 1.15);
    if (slot === 1) {
      motif(c, "shield", 256, 250, color, 1.15);
      for (let j = 0; j < 4; j++)
        line(
          c,
          [
            [91, 206 + j * 36],
            [152, 206 + j * 36],
          ],
          "#ffd89a",
          7,
        );
    }
    if (slot === 2) {
      for (let j = 0; j < 7; j++) {
        const a = (j * TAU) / 7;
        line(
          c,
          [
            [256, 263],
            [256 + Math.cos(a + 0.2) * 70, 263 + Math.sin(a + 0.2) * 70],
            [256 + Math.cos(a) * 160, 263 + Math.sin(a) * 130],
          ],
          color,
          6,
          13,
        );
      }
      gem(c, 256, 265, 43, color, 5);
    }
    if (slot === 3) {
      flame(c, 256, 314, color, 100);
      hammer(c, 256, 186, color, 0.9);
    }
  } else if (hero === 2) {
    if (slot === 0) drawWeapon(c, 3, color);
    if (slot === 1) {
      for (const s of [-1, 1]) motif(c, "eye", 256 + s * 74, 256, color, 0.47);
      wings(c, 256, 288, color, 92);
    }
    if (slot === 2) {
      motif(c, "mist", 256, 256, color, 1.2);
      petal(c, 258, 306, 0.1, 160, 50, color);
    }
    if (slot === 3) {
      for (let j = 0; j < 4; j++) {
        c.save();
        c.translate(256, 256);
        c.rotate((j * Math.PI) / 2 + 0.3);
        line(
          c,
          [
            [-132, -58],
            [103, 66],
          ],
          color,
          17 - j * 2,
          16,
        );
        c.restore();
      }
    }
  } else if (hero === 3) {
    if (slot === 0) {
      drawWeapon(c, 4, color);
      lightning(c, 275, 232, color, 0.65);
    }
    if (slot === 1) {
      for (let j = 0; j < 3; j++)
        lightning(c, 145 + j * 110, 260 - (j % 2) * 52, color, 0.55);
    }
    if (slot === 2) {
      wings(c, 256, 280, color, 155);
      lightning(c, 256, 255, color, 0.75);
    }
    if (slot === 3) {
      for (let j = 0; j < 4; j++)
        lightning(c, 167 + j * 61, 256 + (j % 2) * 47, color, 0.7);
      ellipse(c, 256, 355, 143, 44, null, color, 5);
    }
  } else if (hero === 4) {
    if (slot === 0) {
      mirror(c, 210, 264, color, 79);
      for (let j = 0; j < 4; j++)
        line(
          c,
          [
            [255, 247 + j * 9],
            [401, 156 + j * 22],
          ],
          "#fffad4",
          7 - j,
          16,
        );
    }
    if (slot === 1) {
      shield(c, 256, 269, 119, color);
      mirror(c, 256, 251, color, 47);
    }
    if (slot === 2) motif(c, "eye", 256, 256, color, 1.2);
    if (slot === 3) {
      for (const s of [-1, 1]) mirror(c, 256 + s * 80, 255, color, 61);
      ellipse(c, 256, 256, 155, 154, null, color, 7);
      lotus(c, 256, 324, color, 50, 8);
    }
  } else if (hero === 5) {
    if (slot === 0) shield(c, 256, 256, 131, color);
    if (slot === 1) {
      for (const s of [-1, 1]) shield(c, 256 + s * 73, 260, 75, color);
      gem(c, 256, 219, 55, color, 6);
    }
    if (slot === 2) {
      motif(c, "shield", 256, 228, color, 0.75);
      for (let j = 0; j < 4; j++)
        ellipse(c, 256, 321, 70 + j * 29, 18 + j * 10, null, color, 4);
    }
    if (slot === 3) {
      shield(c, 256, 237, 110, color);
      for (let j = 0; j < 3; j++)
        ellipse(c, 256, 265, 136 + j * 14, 120 + j * 14, null, color + "b0", 3);
    }
  } else if (hero === 6) {
    if (slot === 0) {
      lotus(c, 256, 280, color, 112, 12);
      flame(c, 256, 217, color, 67);
    }
    if (slot === 1) {
      for (let j = 0; j < 6; j++)
        flame(
          c,
          256 + Math.cos((j * TAU) / 6) * 91,
          256 + Math.sin((j * TAU) / 6) * 91,
          color,
          48,
        );
      gem(c, 256, 256, 48, "#fff6bf", 8);
    }
    if (slot === 2) {
      flame(c, 224, 258, color, 102);
      for (let j = 0; j < 4; j++)
        line(
          c,
          [
            [305, 207 + j * 39],
            [409 - j * 11, 182 + j * 39],
          ],
          color,
          8,
        );
    }
    if (slot === 3) {
      lotus(c, 256, 273, color, 157, 12);
      flame(c, 256, 237, color, 115);
    }
  } else if (hero === 7) {
    if (slot === 0) {
      line(
        c,
        [
          [153, 369],
          [357, 146],
        ],
        "#e2fdff",
        19,
        14,
      );
      gem(c, 354, 148, 48, color, 4);
    }
    if (slot === 1) {
      snow(c, 256, 256, color, 153);
      ellipse(c, 256, 256, 174, 146, null, color, 4);
    }
    if (slot === 2) drawWeapon(c, 8, color);
    if (slot === 3) {
      drawWeapon(c, 8, color);
      for (let j = 0; j < 6; j++)
        snow(
          c,
          256 + Math.cos((j * TAU) / 6) * 135,
          256 + Math.sin((j * TAU) / 6) * 135,
          color,
          34,
        );
    }
  } else if (hero === 8) {
    if (slot === 0) bow(c, 256, 256, color);
    if (slot === 1) {
      motif(c, "eye", 256, 256, color, 1.1);
      gem(c, 256, 256, 57, "#d5ddff", 5);
    }
    if (slot === 2) {
      for (let j = 0; j < 4; j++)
        line(
          c,
          [
            [133, 192 + j * 49],
            [359, 155 + j * 49],
          ],
          color,
          13 - j * 2,
          18,
        );
      petal(c, 275, 290, 0.4, 144, 42, color);
    }
    if (slot === 3) {
      for (let j = 0; j < 7; j++) {
        line(
          c,
          [
            [129 + j * 39, 375],
            [214 + j * 34, 145],
          ],
          color,
          5,
          12,
        );
        gem(c, 214 + j * 34, 145, 16, "#edf4ff", 4);
      }
    }
  } else if (hero === 9) {
    if (slot === 0) {
      for (let j = 0; j < 3; j++) {
        c.beginPath();
        c.moveTo(154 + j * 78, 132);
        c.quadraticCurveTo(87 + j * 78, 249, 201 + j * 60, 379);
        c.strokeStyle = color;
        c.lineWidth = 14;
        c.stroke();
      }
    }
    if (slot === 1) {
      shield(c, 256, 256, 128, color);
      tiger(c, 256, 251, color);
    }
    if (slot === 2) {
      motif(c, "path", 256, 256, color, 1.2);
      tiger(c, 256, 231, color);
    }
    if (slot === 3) {
      flame(c, 256, 264, "#ff983c", 139);
      tiger(c, 256, 256, color);
    }
  } else if (hero === 10) {
    if (slot === 0) {
      for (let j = 0; j < 4; j++) {
        c.beginPath();
        c.moveTo(140, 149 + j * 46);
        c.quadraticCurveTo(336, 104 + j * 43, 379, 221 + j * 43);
        c.strokeStyle = color;
        c.lineWidth = 7;
        c.stroke();
      }
      drawWeapon(c, 11, color);
    }
    if (slot === 1) {
      lotus(c, 256, 267, color, 118, 12);
      motif(c, "heart", 256, 255, "#ffe4c0", 0.5);
    }
    if (slot === 2) {
      for (let j = 0; j < 4; j++)
        ellipse(c, 256, 256, 68 + j * 33, 52 + j * 26, null, color, 7 - j);
      drawWeapon(c, 11, color);
    }
    if (slot === 3) {
      for (let j = 0; j < 9; j++)
        petal(c, 256, 280, (j * TAU) / 9, 151, 17, color);
      lotus(c, 256, 272, color, 96, 9);
    }
  } else {
    if (slot === 0) snake(c, 256, 256, color, 1.2);
    if (slot === 1) {
      snake(c, 256, 256, color);
      for (let j = 0; j < 3; j++)
        ellipse(c, 256, 256, 95 + j * 23, 101 + j * 18, null, color, 5 - j);
    }
    if (slot === 2) {
      motif(c, "portal", 256, 256, color, 1.1);
      snake(c, 256, 254, color, 0.6);
    }
    if (slot === 3) {
      for (let j = 0; j < 4; j++)
        snake(c, 205 + j * 35, 231 + (j % 2) * 56, color, 0.65);
      ellipse(c, 256, 347, 161, 47, null, color, 5);
    }
  }
  c.restore();
}

export class MasterworkIconGenerator {
  constructor() {
    this.cache = new Map();
    this.renderCount = 0;
  }
  generate(type, id, rarity, element, size = 512) {
    ({ type, id } = normalize(type, id));
    size = Math.max(32, Math.min(1024, Math.round(size)));
    const hero =
      type === "skill"
        ? Math.floor((id - 1) / 4)
        : type === "skin"
          ? Math.floor((id - 1) / 2)
          : id - 1;
    const tier =
      rarity ??
      (type === "item"
        ? ITEMS[id - 1]?.tier
        : type === "ring"
          ? RINGS[id - 1]?.black
            ? 3
            : 2
          : type === "bone"
            ? id === 7
              ? 3
              : 2
            : type === "skin"
              ? id % 2
                ? 2
                : 3
              : 2);
    const color =
      resolveElement(element) ??
      (type === "item"
        ? ITEM_COLORS[id - 1]
        : type === "bone"
          ? [
              "#73cfff",
              "#71e3b0",
              "#ff975f",
              "#a78dff",
              "#83e8d4",
              "#edc283",
              "#e98cff",
            ][id - 1]
          : type === "support"
            ? ELEMENTS[(id * 5) % 12]
            : type === "ring"
              ? ELEMENTS[[0, 6, 0, 1, 2, 3, 4, 5, 7, 8, 9, 11][id - 1]]
              : ELEMENTS[hero % 12]) ??
      "#8debc8";
    const key = `${type}:${id}:${tier}:${color}:${size}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const canvas = globalThis.document?.createElement("canvas");
    if (!canvas)
      throw Error("Masterwork icons require a browser Canvas2D at render time");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d");
    if (!c) throw Error("Canvas2D unavailable");
    c.scale(size / 512, size / 512);
    background(c, tier, color, id * 491 + type.length * 731);
    c.save();
    c.shadowColor = "#000c";
    c.shadowBlur = 18;
    c.shadowOffsetY = 10;
    if (type === "bone") drawBone(c, id, color);
    else if (type === "ring") drawRing(c, id, color);
    else if (type === "item") drawItem(c, id, color);
    else if (type === "support") drawSupport(c, id, color);
    else if (type === "weapon") drawWeapon(c, id, color);
    else if (type === "skin") drawWeapon(c, hero + 1, color, id % 2 ? 1 : 2);
    else if (type === "skill") drawSkill(c, hero, (id - 1) % 4, color);
    else if (type === "action") {
      if (id === 1) {
        for (const s of [-1, 1]) {
          c.save();
          c.translate(256, 256);
          c.rotate(s * 0.75);
          fillPath(
            c,
            [
              [-12, 132],
              [12, 132],
              [12, -82],
              [0, -144],
              [-12, -82],
            ],
            metal(c),
            "#fff2bb",
            3,
          );
          line(
            c,
            [
              [-48, 57],
              [48, 57],
            ],
            "#e4bd7a",
            14,
          );
          c.restore();
        }
      } else if (id === 2) {
        motif(c, "path", 256, 256, color, 1.2);
        for (let j = 0; j < 3; j++)
          line(
            c,
            [
              [95, 208 + j * 53],
              [188, 188 + j * 53],
            ],
            color,
            8,
          );
      } else if (id === 3) tiger(c, 256, 256, color);
      else motif(c, "eye", 256, 256, color, 1.05);
    } else {
      gem(c, 256, 256, 111, color, 5 + (id % 4));
      if (type === "fragment") motif(c, "compass", 256, 256, color, 0.7);
    }
    c.restore();
    const uri = canvas.toDataURL("image/png");
    this.cache.set(key, uri);
    this.renderCount++;
    return uri;
  }
  clear() {
    this.cache.clear();
  }
}
export class ProceduralMasterworkAssetEngine extends MasterworkIconGenerator {
  catalogue() {
    return [
      ...BONES.map((i) => ({ type: "bone", id: i.id, name: i.name })),
      ...RINGS.map((i) => ({ type: "ring", id: i.id, name: i.name })),
      ...ITEMS.map((i) => ({ type: "item", id: i.id, name: i.name })),
      ...SUPPORTS.map((i) => ({ type: "support", id: i.id, name: i.name })),
      ...WEAPONS.map((name, i) => ({ type: "weapon", id: i + 1, name })),
      ...HEROES.flatMap((h, i) =>
        [1, 2].map((s) => ({
          type: "skin",
          id: i * 2 + s,
          name: `${h.name} / ${s === 2 ? "VIP" : "Cơ bản"}`,
        })),
      ),
      ...SKILLS.flatMap((skills, h) =>
        skills.map((s, k) => ({
          type: "skill",
          id: h * 4 + k + 1,
          name: s.name,
        })),
      ),
    ];
  }
}
export const masterworkAssets = new ProceduralMasterworkAssetEngine();
export const generateMasterworkItemIcon = (
  type,
  id,
  rarity,
  element,
  size = 512,
) => (size===512&&bakedUiAssetUrls[type+':'+numberId(id)]) || masterworkAssets.generate(type, id, rarity, element, size);
export function skillIcon(hero, slot) {
  const h = typeof hero === "number" ? hero : numberId(hero) - 1;
  return generateMasterworkItemIcon(
    "skill",
    h * 4 + slot + 1,
    slot === 3 ? 3 : 2,
    ELEMENTS[h],
  );
}
export const renderSkillIconCanvas = skillIcon;
export function itemIcon(type, id, options = {}) {
  const {
    rarity,
    element,
    size = 512,
    className = "item-art",
    label = "",
    skin,
  } = options;
  if (type === "weapon" && skin) {
    id = (numberId(id) - 1) * 2 + skin;
    type = "skin";
  }
  return `<img class="${esc(className)}" src="${generateMasterworkItemIcon(type, id, rarity, element, size)}" width="${Number(size) || 512}" height="${Number(size) || 512}" alt="${esc(label)}" draggable="false" decoding="async" data-art-type="${esc(type)}" data-art-id="${esc(id)}">`;
}
