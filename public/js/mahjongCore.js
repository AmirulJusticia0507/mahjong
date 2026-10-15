// Client-side helpers for tiles (mapping, sorting). Server is authoritative.
(function (global) {
  const SUIT_LABEL = { B: 'Bambu', K: 'Koin', M: 'Karakter' };
  const HONOUR_LABEL = { WE: 'Timur', WS: 'Selatan', WW: 'Barat', WN: 'Utara', DR: 'Merah', DG: 'Hijau', DW: 'Putih' };

  function tileLabel(code) {
    if (HONOUR_LABEL[code]) return HONOUR_LABEL[code];
    const suit = code[0];
    const rank = code.slice(1);
    return `${SUIT_LABEL[suit] || suit} ${rank}`;
  }

  function tileColor(code) {
    if (code[0] === 'B') return 'bg-emerald-600';
    if (code[0] === 'K') return 'bg-amber-600';
    if (code[0] === 'M') return 'bg-rose-600';
    return 'bg-slate-600';
  }

  function tileHTML(code, extraClass = '') {
    return `<button class="tile ${tileColor(code)} ${extraClass} text-white text-xs font-bold rounded px-2 py-1 m-1" data-tile="${code}">${code}</button>`;
  }

  global.MahjongCore = { tileLabel, tileColor, tileHTML };
})(window);