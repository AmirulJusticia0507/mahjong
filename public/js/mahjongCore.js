// Client-side helpers for tiles (mapping, sorting). Server is authoritative.
(function (global) {
  const SUIT_LABEL = { B: 'Bambu', K: 'Koin', M: 'Karakter' };
  const HONOUR_LABEL = { WE: 'Timur', WS: 'Selatan', WW: 'Barat', WN: 'Utara', DR: 'Merah', DG: 'Hijau', DW: 'Putih' };
  const WIND_SYMBOL = { WE: '🀀', WS: '🀁', WW: '🀂', WN: '🀃' };
  const DRAGON_SYMBOL = { DR: '🀄', DG: '🀅', DW: '🀆' };
  const SUIT_START = { M: 0x1F007, B: 0x1F010, K: 0x1F019 };

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

  function tileSymbol(code) {
    if (WIND_SYMBOL[code]) return WIND_SYMBOL[code];
    if (DRAGON_SYMBOL[code]) return DRAGON_SYMBOL[code];
    const start = SUIT_START[code[0]];
    const rank = Number(code.slice(1));
    if (!start || rank < 1 || rank > 9) return '�';
    return String.fromCodePoint(start + rank - 1);
  }

  function tileHTML(code, extraClass = '', interactive = true) {
    const tag = interactive ? 'button' : 'span';
    const data = interactive ? ` data-tile="${code}"` : '';
    return `<${tag} class="tile tile-${code[0].toLowerCase()} ${extraClass}"${data} title="${tileLabel(code)}" aria-label="${tileLabel(code)}"><span class="tile-symbol" aria-hidden="true">${tileSymbol(code)}</span><span class="tile-code">${code}</span></${tag}>`;
  }

  global.MahjongCore = { tileLabel, tileColor, tileSymbol, tileHTML };
})(window);
