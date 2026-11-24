// Struktur data: Trie (autocomplete) dan AVL Tree (filter rentang budget)
class Trie {
  constructor() { this.c = new Map(); this.end = []; }
  insert(w) {
    let n = this;
    for (const ch of [...String(w).toLowerCase()]) {
      if (!n.c.has(ch)) n.c.set(ch, new Trie());
      n = n.c.get(ch);
    }
    if (!n.end.includes(w)) n.end.push(w);
  }
  suggest(p, lim = 8) {
    let n = this;
    for (const ch of [...String(p).toLowerCase()]) {
      if (!n.c.has(ch)) return [];
      n = n.c.get(ch);
    }
    const o = [];
    n.walk(o, lim);
    return o;
  }
  walk(o, lim) {
    for (const w of this.end) { if (o.length >= lim) return; o.push(w); }
    for (const x of this.c.values()) { if (o.length >= lim) return; x.walk(o, lim); }
  }
}

class Nd { constructor(k, v) { this.k = k; this.v = [v]; this.l = null; this.r = null; this.h = 1; } }

class AVL {
  constructor() { this.root = null; }
  static H(n) { return n ? n.h : 0; }
  static up(n) { n.h = 1 + Math.max(AVL.H(n.l), AVL.H(n.r)); }
  static rr(y) { const x = y.l; y.l = x.r; x.r = y; AVL.up(y); AVL.up(x); return x; }
  static rl(x) { const y = x.r; x.r = y.l; y.l = x; AVL.up(x); AVL.up(y); return y; }
  insert(k, v) { this.root = this.ins(this.root, k, v); }
  ins(n, k, v) {
    if (!n) return new Nd(k, v);
    if (k === n.k) { n.v.push(v); return n; }
    if (k < n.k) n.l = this.ins(n.l, k, v); else n.r = this.ins(n.r, k, v);
    AVL.up(n);
    const b = AVL.H(n.l) - AVL.H(n.r);
    if (b > 1) { if (k > n.l.k) n.l = AVL.rl(n.l); return AVL.rr(n); }
    if (b < -1) { if (k < n.r.k) n.r = AVL.rr(n.r); return AVL.rl(n); }
    return n;
  }
  range(lo, hi) { const o = []; this.walk(this.root, lo, hi, o); return o; }
  walk(n, lo, hi, o) {
    if (!n) return;
    if (lo < n.k) this.walk(n.l, lo, hi, o);
    if (lo <= n.k && n.k <= hi) o.push(...n.v);
    if (hi > n.k) this.walk(n.r, lo, hi, o);
  }
}
