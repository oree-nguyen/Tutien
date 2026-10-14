import * as THREE from "three";
import { HEROES } from "./data.js";
export function costumeColor(hero, costume = 0) {
  return new THREE.Color(HEROES[hero].color)
    .offsetHSL(
      costume * 0.065,
      costume === 2 ? 0.12 : 0,
      costume === 1 ? -0.12 : costume === 3 ? 0.08 : 0,
    )
    .getHex();
}
export { animateVisual as animateRig } from "./art.js";
