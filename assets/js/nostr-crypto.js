/**
 * Minimal, zero-dependency NIP-01 / BIP-340 Schnorr (secp256k1) signer & verifier
 * Uses native BigInt + WebCrypto SHA-256 for decentralized Global Chat & Leaderboards.
 */
(function (global) {
  'use strict';

  const P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  const GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
  const GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
  const ENC = new TextEncoder();

  function mod(a, m = P) {
    const r = a % m;
    return r >= 0n ? r : r + m;
  }

  function powMod(base, exp, m = P) {
    let res = 1n;
    let b = mod(base, m);
    let e = exp;
    while (e > 0n) {
      if (e & 1n) res = (res * b) % m;
      b = (b * b) % m;
      e >>= 1n;
    }
    return res;
  }

  function invMod(a, m = P) {
    let t = 0n, newT = 1n;
    let r = m, newR = mod(a, m);
    while (newR !== 0n) {
      const q = r / newR;
      [t, newT] = [newT, t - q * newT];
      [r, newR] = [newR, r - q * newR];
    }
    return t < 0n ? t + m : t;
  }

  function pointAdd(p1, p2) {
    if (!p1) return p2;
    if (!p2) return p1;
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    if (x1 === x2) {
      if (y1 !== y2 || y1 === 0n) return null;
      const lam = mod(3n * x1 * x1 * invMod(2n * y1));
      const x3 = mod(lam * lam - 2n * x1);
      const y3 = mod(lam * (x1 - x3) - y1);
      return [x3, y3];
    }
    const lam = mod((y2 - y1) * invMod(x2 - x1));
    const x3 = mod(lam * lam - x1 - x2);
    const y3 = mod(lam * (x1 - x3) - y1);
    return [x3, y3];
  }

  function pointMul(k, pt = [GX, GY]) {
    let scalar = mod(k, N);
    if (scalar === 0n) return null;
    let res = null;
    let addend = pt;
    while (scalar > 0n) {
      if (scalar & 1n) res = pointAdd(res, addend);
      addend = pointAdd(addend, addend);
      scalar >>= 1n;
    }
    return res;
  }

  function liftX(x) {
    if (x <= 0n || x >= P) return null;
    const c = mod(powMod(x, 3n, P) + 7n, P);
    const y = powMod(c, (P + 1n) / 4n, P);
    if (powMod(y, 2n, P) !== c) return null;
    return [x, (y & 1n) === 0n ? y : P - y];
  }

  function bytesToHex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
      s += bytes[i].toString(16).padStart(2, '0');
    }
    return s;
  }

  function hexToBytes(hex) {
    if (typeof hex !== 'string' || hex.length % 2 !== 0) return new Uint8Array(0);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  function numTo32Bytes(num) {
    return hexToBytes(num.toString(16).padStart(64, '0'));
  }

  function bytesToNum(bytes) {
    return BigInt('0x' + (bytesToHex(bytes) || '0'));
  }

  function concatBytes(...arrays) {
    const total = arrays.reduce((acc, a) => acc + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
      out.set(a, offset);
      offset += a.length;
    }
    return out;
  }

  async function sha256(bytes) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(buf);
  }

  const tagCache = new Map();
  async function taggedHash(tag, ...msgs) {
    let th = tagCache.get(tag);
    if (!th) {
      th = await sha256(ENC.encode(tag));
      tagCache.set(tag, th);
    }
    return sha256(concatBytes(th, th, ...msgs));
  }

  function generateSecretKey() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const d = (bytesToNum(bytes) % (N - 1n)) + 1n;
    return bytesToHex(numTo32Bytes(d));
  }

  function getPublicKey(privHex) {
    const d0 = bytesToNum(hexToBytes(privHex));
    const pt = pointMul(d0);
    if (!pt) throw new Error('Invalid private key');
    return pt[0].toString(16).padStart(64, '0');
  }

  async function schnorrSign(msgHex, privHex) {
    const msg = hexToBytes(msgHex);
    const d0 = bytesToNum(hexToBytes(privHex));
    if (d0 <= 0n || d0 >= N) throw new Error('Invalid private key');
    const Ppt = pointMul(d0);
    const d = (Ppt[1] & 1n) === 0n ? d0 : N - d0;
    const px = numTo32Bytes(Ppt[0]);

    const aux = new Uint8Array(32);
    crypto.getRandomValues(aux);
    const auxHash = await taggedHash('BIP0340/aux', aux);
    const dBytes = numTo32Bytes(d);
    const t = new Uint8Array(32);
    for (let i = 0; i < 32; i++) t[i] = dBytes[i] ^ auxHash[i];

    const rand = await taggedHash('BIP0340/nonce', t, px, msg);
    const k0 = mod(bytesToNum(rand), N);
    if (k0 === 0n) throw new Error('Nonce failure');
    const R = pointMul(k0);
    const k = (R[1] & 1n) === 0n ? k0 : N - k0;
    const rx = numTo32Bytes(R[0]);

    const eHash = await taggedHash('BIP0340/challenge', rx, px, msg);
    const e = mod(bytesToNum(eHash), N);
    const s = mod(k + e * d, N);
    return bytesToHex(concatBytes(rx, numTo32Bytes(s)));
  }

  async function schnorrVerify(sigHex, msgHex, pubHex) {
    try {
      if (sigHex.length !== 128 || pubHex.length !== 64 || msgHex.length !== 64) return false;
      const Ppt = liftX(BigInt('0x' + pubHex));
      if (!Ppt) return false;
      const r = BigInt('0x' + sigHex.slice(0, 64));
      const s = BigInt('0x' + sigHex.slice(64, 128));
      if (r >= P || s >= N) return false;
      const eHash = await taggedHash(
        'BIP0340/challenge',
        hexToBytes(sigHex.slice(0, 64)),
        hexToBytes(pubHex),
        hexToBytes(msgHex)
      );
      const e = mod(bytesToNum(eHash), N);
      const sG = pointMul(s);
      const eP = pointMul(e, Ppt);
      const negEP = eP ? [eP[0], mod(-eP[1], P)] : null;
      const R = pointAdd(sG, negEP);
      if (!R || (R[1] & 1n) !== 0n || R[0] !== r) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  async function signEvent(template, privHex) {
    const pubkey = getPublicKey(privHex);
    const ev = {
      pubkey,
      created_at: template.created_at || Math.floor(Date.now() / 1000),
      kind: template.kind,
      tags: template.tags || [],
      content: String(template.content || '')
    };
    const serialized = JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]);
    const idBytes = await sha256(ENC.encode(serialized));
    ev.id = bytesToHex(idBytes);
    ev.sig = await schnorrSign(ev.id, privHex);
    return ev;
  }

  async function verifyEvent(ev) {
    try {
      if (!ev || typeof ev !== 'object') return false;
      const serialized = JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]);
      const idHex = bytesToHex(await sha256(ENC.encode(serialized)));
      if (idHex !== ev.id) return false;
      return schnorrVerify(ev.sig, ev.id, ev.pubkey);
    } catch (_) {
      return false;
    }
  }

  global.NostrCrypto = {
    generateSecretKey,
    getPublicKey,
    signEvent,
    verifyEvent,
    schnorrVerify
  };
})(typeof window !== 'undefined' ? window : globalThis);
