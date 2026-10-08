// AI placement: turns a floor/wall segmentation grid + phone pose into a spot on the floor.
// Pure functions (no DOM) so they can be tested outside the browser.
//
// Camera frame used here: a = metres to the right, b = metres straight ahead (both on the floor plane),
// measured from the point on the floor under the phone.

export const FLOOR_IDS = new Set([3, 28]); // ADE20K: floor, rug

// How each product "wants" to sit in a room.
export const NATURE = {
  sofa:  { kind: 'wall',  gap: 0.05, label: 'against the wall' },
  shelf: { kind: 'wall',  gap: 0.02, label: 'flat against the wall' },
  chair: { kind: 'wall',  gap: 0.30, side: -0.45, angle: 20, label: 'near the wall, angled in' },
  lamp:  { kind: 'wall',  gap: 0.12, side: 0.55, label: 'in the corner by the wall' },
  table: { kind: 'open',  label: 'in the open floor, in front of you' },
};

// Ray through a normalised image point (uf, vf in 0..1, v down) hits the floor where?
export function floorHit(uf, vf, cam) {
  const x = (uf - 0.5) * 2 * Math.tan(cam.hfov / 2);
  const y = -(vf - 0.5) * 2 * Math.tan(cam.vfov / 2);
  const p = cam.pitch; // radians, negative = looking down
  const yw = y * Math.cos(p) + Math.sin(p);
  const zw = -y * Math.sin(p) + Math.cos(p);
  if (yw >= -1e-3) return null; // at or above the horizon
  const t = cam.height / -yw;
  return { a: x * t, b: zw * t };
}

// labels: Int/Uint array of class ids, row-major, gw x gh, row 0 = top of the frame.
export function analyze(labels, gw, gh, cam) {
  const isFloor = (c, r) => FLOOR_IDS.has(labels[r * gw + c]);
  let floorCount = 0;
  for (let i = 0; i < labels.length; i++) if (FLOOR_IDS.has(labels[i])) floorCount++;
  const floorFrac = floorCount / labels.length;
  if (floorFrac < 0.04) return { ok: false, reason: 'no-floor', floorFrac };

  const step = Math.max(1, Math.floor(gw / 40));
  const pts = [], rows = [];
  let reachTop = 0, cols = 0;
  for (let c = Math.floor(gw * 0.1); c < gw * 0.9; c += step) {
    cols++;
    // find the lowest floor run, allowing a little clutter at the very bottom
    let r = gh - 1, skipped = 0;
    while (r >= 0 && !isFloor(c, r) && skipped < gh * 0.25) { r--; skipped++; }
    if (r < 0 || !isFloor(c, r)) continue;
    let top = r, gap = 0;
    for (let k = r; k >= 0; k--) {
      if (isFloor(c, k)) { top = k; gap = 0; }
      else if (++gap > Math.max(2, gh * 0.02)) break;
    }
    if (top <= 1) { reachTop++; continue; }
    const hit = floorHit((c + 0.5) / gw, top / gh, cam);
    if (!hit || hit.b < 0.4 || hit.b > 12) continue;
    pts.push(hit); rows.push({ c, r: top });
  }
  if (pts.length < 5) {
    return { ok: false, reason: reachTop > cols * 0.5 ? 'tilt-down' : 'no-wall', floorFrac, rows };
  }
  // robust line fit b = m*a + c0: fit, drop the worst quarter, refit twice
  let use = pts.slice(), m = 0, c0 = 0;
  for (let it = 0; it < 3; it++) {
    const n = use.length, sa = use.reduce((s, p) => s + p.a, 0), sb = use.reduce((s, p) => s + p.b, 0);
    const ma = sa / n, mb = sb / n;
    let num = 0, den = 0;
    for (const p of use) { num += (p.a - ma) * (p.b - mb); den += (p.a - ma) ** 2; }
    m = den > 1e-6 ? num / den : 0;
    m = Math.max(-1.2, Math.min(1.2, m));
    c0 = mb - m * ma;
    if (it < 2 && use.length > 8) {
      use.sort((p, q) => Math.abs(p.b - (m * p.a + c0)) - Math.abs(q.b - (m * q.a + c0)));
      use = use.slice(0, Math.ceil(use.length * 0.75));
    }
  }
  const aMin = Math.min(...use.map(p => p.a)), aMax = Math.max(...use.map(p => p.a));
  return { ok: true, m, c: c0, aMin, aMax, floorFrac, rows, n: pts.length };
}

// Where the product goes, in the camera frame. Returns centre (a, b) and the direction its front faces.
export function place(id, depthM, widthM, wall) {
  const nat = NATURE[id] || NATURE.sofa;
  const { m, c } = wall;
  const nlen = Math.hypot(m, 1);
  const n = { a: m / nlen, b: -1 / nlen }; // wall normal, pointing back toward the phone
  if (nat.kind === 'open') {
    const b = Math.max(1.0, Math.min(c * 0.55, c - 1.0));
    return { a: 0, b, front: n, nature: nat.label };
  }
  // slide along the wall for side pieces, but stay inside what the camera saw
  let a0 = 0;
  if (nat.side) {
    const half = Math.max(0.3, (wall.aMax - wall.aMin) / 2);
    a0 = Math.max(wall.aMin + widthM / 2, Math.min(wall.aMax - widthM / 2, nat.side * half));
    if (!(wall.aMax - wall.aMin > widthM)) a0 = 0;
  }
  const wb = m * a0 + c;
  const off = depthM / 2 + (nat.gap || 0);
  let front = n;
  if (nat.angle) {
    const t = (nat.side > 0 ? -1 : 1) * nat.angle * Math.PI / 180;
    front = { a: n.a * Math.cos(t) - n.b * Math.sin(t), b: n.a * Math.sin(t) + n.b * Math.cos(t) };
  }
  return { a: a0 + n.a * off, b: wb + n.b * off, front, nature: nat.label };
}
