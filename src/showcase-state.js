/** Describe the objects actually drawn, independently of asset-loading labels. */
export function showcaseState(preview, animationMode = false) {
  const state = {
    animationMode: !!animationMode,
    heroId: null,
    status: null,
    visibleSkinned: 0,
    visibleSource: 0,
    visibleTriangles: 0,
    meshes: [],
    bones: [],
    entranceTime: null,
  };
  const bones = new Map();
  preview?.traverse((node) => {
    if (node.userData.manualHunyuan) {
      state.heroId = node.userData.manualAsset?.id ?? null;
      state.status = node.userData.manualAsset?.status ?? null;
      state.entranceTime = node.userData.manualAsset?.entrance?.time ?? null;
    }
    if (!node.isMesh) return;
    for (let ancestor = node; ancestor; ancestor = ancestor.parent)
      if (!ancestor.visible) return;
    const skinned = !!node.isSkinnedMesh;
    const source = node.userData.tencentSource === true;
    if (!skinned && !source) return;
    if (skinned)
      for (const bone of node.skeleton.bones) {
        const channel = {
          name: bone.name,
          position: bone.position.toArray(),
          quaternion: bone.quaternion.toArray(),
          scale: bone.scale.toArray(),
        };
        const previous = bones.get(bone.name);
        if (previous && JSON.stringify(previous) !== JSON.stringify(channel))
          throw Error("Divergent visible skeleton joint " + bone.name);
        bones.set(bone.name, channel);
      }
    const geometry = node.geometry;
    const triangles =
      (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3;
    const material = Array.isArray(node.material)
      ? node.material
      : [node.material];
    state.visibleSkinned += Number(skinned);
    state.visibleSource += Number(source);
    state.visibleTriangles += triangles;
    state.meshes.push({
      name: node.name,
      skinned,
      source,
      triangles,
      textures: material.map((entry) => ({
        albedo: entry?.map?.image?.width ?? null,
        normal: entry?.normalMap?.image?.width ?? null,
        metalRoughness: entry?.roughnessMap?.image?.width ?? null,
      })),
    });
  });
  state.bones = [...bones.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return state;
}
