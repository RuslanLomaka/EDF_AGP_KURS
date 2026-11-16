'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const kern = require('./kern.js');

describe('kurs.mische', () => {
  it('returns a new array of the same length', () => {
    const a = [1, 2, 3, 4, 5];
    const b = kern.mische(a);
    assert.notEqual(b, a);
    assert.equal(b.length, 5);
    assert.deepEqual([...b].sort(), [1, 2, 3, 4, 5]);
  });
  it('does not change the original', () => {
    const a = ['x', 'y', 'z'];
    kern.mische(a);
    assert.deepEqual(a, ['x', 'y', 'z']);
  });
  it('handles empty and single-element lists', () => {
    assert.deepEqual(kern.mische([]), []);
    assert.deepEqual(kern.mische([7]), [7]);
  });
});

describe('kurs.norm', () => {
  it('folds umlauts and case', () => {
    assert.equal(kern.norm('Abzüge'), kern.norm('abzuge'));
    assert.equal(kern.norm('Größe'), kern.norm('groesse'));
    assert.equal(kern.norm('Über'), kern.norm('ueber'));
  });
  it('folds ae/oe/ue spellings', () => {
    assert.equal(kern.norm('aenderung'), kern.norm('änderung'));
    assert.equal(kern.norm('oel'), kern.norm('öl'));
  });
  it('treats ß as ss', () => {
    assert.equal(kern.norm('Straße'), kern.norm('strasse'));
  });
});

describe('kurs.leseJSON / schreibeJSON', () => {
  const store = {};
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };

  it('round-trips an object', () => {
    assert.equal(kern.schreibeJSON('t1', { a: 1 }), true);
    assert.deepEqual(kern.leseJSON('t1', null), { a: 1 });
  });
  it('returns the fallback when missing', () => {
    assert.deepEqual(kern.leseJSON('fehlt', []), []);
  });
  it('returns the fallback on bad JSON', () => {
    store.bad = '{';
    assert.equal(kern.leseJSON('bad', 42), 42);
  });
  it('returns false when storage throws', () => {
    const old = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('quota'); };
    assert.equal(kern.schreibeJSON('x', 1), false);
    globalThis.localStorage.setItem = old;
  });
});

describe('kurs.heuteISO', () => {
  it('looks like Y-M-D without leading zeros required', () => {
    assert.match(kern.heuteISO(), /^\d{4}-\d{1,2}-\d{1,2}$/);
  });
});

describe('kurs.mische distribution', () => {
  it('keeps all items unique when input is unique', () => {
    const a = ['a', 'b', 'c', 'd'];
    const b = kern.mische(a);
    assert.equal(new Set(b).size, 4);
  });
  it('works with objects by identity', () => {
    const o1 = { n: 1 }, o2 = { n: 2 };
    const b = kern.mische([o1, o2]);
    assert.ok(b.includes(o1) && b.includes(o2));
  });
});

describe('kurs.norm extras', () => {
  it('is idempotent', () => {
    const s = kern.norm('Übung ÄÖÜ');
    assert.equal(kern.norm(s), s);
  });
  it('handles empty string', () => {
    assert.equal(kern.norm(''), '');
  });
  it('coerces non-strings', () => {
    assert.equal(kern.norm(123), '123');
  });
});

describe('kurs.scrollZu / vorlesen stop', () => {
  it('scrollZu is a function', () => {
    assert.equal(typeof kern.scrollZu, 'function');
    assert.equal(typeof kern.scrollSeite, 'function');
  });
  it('stoppeVorlesen runs registered stops', () => {
    let n = 0;
    kern.setzeVorlesenStopp(() => { n += 1; });
    kern.setzeVorlesenStopp(() => { n += 10; });
    kern.stoppeVorlesen();
    assert.equal(n, 11);
  });
});
