// Furniture models built from primitives at real-world scale (meters). Shared by the page and the .glb build script.
// The recolorable material is always named "Body".
export function buildModel(id, THREE, RoundedBoxGeometry, bodyColor) {
  const mat = (name, color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide });
    m.name = name;
    if (o.e) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 1; }
    return m;
  };
  const rbox = (w, h, d, r, m, x = 0, y = 0, z = 0, seg = 4) => {
    const mesh = new THREE.Mesh(seg ? new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999) : new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); return mesh;
  };
  const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 32) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
    mesh.position.set(x, y, z); return mesh;
  };
  const g = new THREE.Group();

  if (id === 'sofa' || id === 'chair') {
    const W = id === 'sofa' ? 2.1 : 0.8, D = id === 'sofa' ? 0.9 : 0.84, seats = id === 'sofa' ? 3 : 1;
    const F = mat('Body', bodyColor, { r: 0.92 }), Wd = mat('Wood', '#7a5236', { r: 0.55 });
    const legH = 0.12, baseH = 0.2, armW = 0.17;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = cyl(0.022, 0.016, legH, Wd, sx * (W / 2 - 0.08), legH / 2, sz * (D / 2 - 0.08), 16);
      leg.rotation.z = sx * 0.12; leg.rotation.x = -sz * 0.12; g.add(leg);
    }
    g.add(rbox(W, baseH, D, 0.04, F, 0, legH + baseH / 2, 0));
    const innerW = W - armW * 2, cw = innerW / seats, seatY = legH + baseH + 0.07;
    for (let i = 0; i < seats; i++) g.add(rbox(cw - 0.012, 0.14, D - 0.24, 0.05, F, -innerW / 2 + cw * (i + 0.5), seatY, 0.06));
    g.add(rbox(W, 0.44, 0.2, 0.07, F, 0, legH + baseH + 0.2, -D / 2 + 0.1));
    for (let i = 0; i < seats; i++) {
      const b = rbox(cw - 0.03, 0.36, 0.13, 0.06, F, -innerW / 2 + cw * (i + 0.5), seatY + 0.24, -D / 2 + 0.25);
      b.rotation.x = -0.12; g.add(b);
    }
    for (const sx of [-1, 1]) g.add(rbox(armW, 0.5, D, 0.07, F, sx * (W / 2 - armW / 2), legH + 0.25, 0));
  }

  if (id === 'table') {
    const Wd = mat('Body', bodyColor, { r: 0.45 }), H = 0.42, R = 0.45;
    g.add(cyl(R, R, 0.035, Wd, 0, H - 0.0175, 0, 72));
    g.add(cyl(R * 0.94, R * 0.94, 0.02, Wd, 0, H - 0.045, 0, 72));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, r = R * 0.62;
      const leg = cyl(0.022, 0.016, H - 0.035, Wd, Math.cos(a) * r, (H - 0.035) / 2, Math.sin(a) * r, 16);
      leg.rotation.z = Math.cos(a) * 0.1; leg.rotation.x = -Math.sin(a) * 0.1; g.add(leg);
    }
  }

  if (id === 'lamp') {
    const S = mat('Body', bodyColor, { r: 0.85, ds: true, e: bodyColor, ei: 0.18 }), M = mat('Brass', '#b8914d', { r: 0.35, m: 1 });
    const Bulb = mat('Bulb', '#fff4d6', { e: '#ffe6a8', ei: 1.4 });
    g.add(cyl(0.15, 0.16, 0.025, M, 0, 0.0125, 0, 48));
    g.add(cyl(0.012, 0.012, 1.4, M, 0, 0.72, 0, 16));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.225, 0.3, 64, 1, true), S);
    shade.position.y = 1.45; g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), Bulb); bulb.position.y = 1.4; g.add(bulb);
  }

  if (id === 'shelf') {
    const Wd = mat('Body', bodyColor, { r: 0.5 }), W = 0.8, H = 1.8, D = 0.3, t = 0.022;
    for (const sx of [-1, 1]) g.add(rbox(t, H, D, 0.004, Wd, sx * (W / 2 - t / 2), H / 2, 0, 1));
    g.add(rbox(W - t * 2, H - 0.06, 0.008, 0.002, Wd, 0, H / 2 + 0.01, -D / 2 + 0.004, 0));
    const levels = 5;
    for (let i = 0; i <= levels; i++) g.add(rbox(W - t * 2, t, D - 0.01, 0.003, Wd, 0, 0.05 + i * ((H - 0.08) / levels), 0.005, 1));
    const bookCols = ['#7c3b3b', '#2f4d6b', '#c9a24e', '#3f5e45', '#d9d2c4', '#4a3f5c'];
    const bookMats = bookCols.map((c, i) => mat('Book' + i, c, { r: 0.7 }));
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (const lvl of [1, 2, 4]) {
      let x = -W / 2 + t + 0.03; const y0 = 0.05 + lvl * ((H - 0.08) / levels) + t / 2;
      const n = 6 + Math.floor(rnd() * 6);
      for (let k = 0; k < n && x < W / 2 - 0.08; k++) {
        const bw = 0.025 + rnd() * 0.02, bh = 0.18 + rnd() * 0.08;
        g.add(rbox(bw, bh, 0.2, 0.003, bookMats[Math.floor(rnd() * bookMats.length)], x + bw / 2, y0 + bh / 2, 0.02, 0));
        x += bw + 0.003;
      }
    }
    const vase = cyl(0.04, 0.055, 0.2, mat('Vase', '#e9e4da', { r: 0.3 }), 0.2, 0.05 + 3 * ((H - 0.08) / levels) + t / 2 + 0.1, 0, 32);
    g.add(vase);
  }
  return g;
}
