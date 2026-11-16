// Shared helpers for the Kursmaterial scripts (shuffle, search fold, localStorage JSON).
// Browser: window.kurs.*; Node tests: module.exports.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.kurs = Object.assign(root.kurs || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Fisher–Yates shuffle; returns a new array. */
  function mische(liste) {
    var neu = liste.slice();
    for (var i = neu.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = neu[i];
      neu[i] = neu[j];
      neu[j] = t;
    }
    return neu;
  }

  /** Fold case and German umlaut spellings for search. */
  function norm(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
      .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function leseJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function schreibeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function heuteISO() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  return {
    mische: mische,
    norm: norm,
    leseJSON: leseJSON,
    schreibeJSON: schreibeJSON,
    heuteISO: heuteISO
  };
});
