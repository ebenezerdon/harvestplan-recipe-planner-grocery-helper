(function(window){
  'use strict';
  window.App = window.App || {};

  // Storage helpers with namespacing and safe JSON
  const NS = 'recipePlanner.v1';
  function key(k){ return NS + ':' + k; }
  function safeParse(str, fallback){
    try { return JSON.parse(str); } catch(e){ return fallback; }
  }
  window.App.AppStorage = {
    load: function(name, fallback){
      try {
        const raw = window.localStorage.getItem(key(name));
        if (!raw) return fallback;
        return safeParse(raw, fallback);
      } catch(e){
        console.error('Storage load failed', name, e);
        return fallback;
      }
    },
    save: function(name, value){
      try {
        window.localStorage.setItem(key(name), JSON.stringify(value));
      } catch(e){ console.error('Storage save failed', name, e); }
    },
    remove: function(name){
      try { window.localStorage.removeItem(key(name)); } catch(e){ console.error('Storage remove failed', name, e); }
    }
  };

  // Utilities
  const uid = () => 'r_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const slugify = (s) => (s||'').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const sanitize = (s) => (s||'').toString().replace(/[\u0000-\u001F\u007F]/g, '').trim();

  // Ingredient parsing: "1 1/2 cups sugar" -> { qty: 1.5, unit: 'cups', name: 'sugar' }
  function parseFraction(str){
    if (!str) return NaN;
    const parts = str.split('/');
    if (parts.length === 2) {
      const a = parseFloat(parts[0]);
      const b = parseFloat(parts[1]);
      if (!isNaN(a) && !isNaN(b) && b !== 0) return a/b;
    }
    return NaN;
  }
  function parseQtyToken(token){
    if (!token) return NaN;
    token = token.trim();
    if (/^\d+\s+\d+\/\d+$/.test(token)) { // 1 1/2
      const [whole, frac] = token.split(/\s+/);
      const w = parseFloat(whole);
      const f = parseFraction(frac);
      if (!isNaN(w) && !isNaN(f)) return w + f;
    }
    if (/^\d+\/\d+$/.test(token)) {
      const f = parseFraction(token);
      return isNaN(f) ? NaN : f;
    }
    const n = parseFloat(token);
    return isNaN(n) ? NaN : n;
  }
  function parseIngredient(line){
    const raw = sanitize(line);
    const tokens = raw.split(/\s+/);
    let qty = NaN; let unit = ''; let name = raw;
    if (tokens.length) {
      const first = tokens[0];
      const second = tokens[1] || '';
      // Try combined quantity like "1 1/2"
      const maybeQty = parseQtyToken(first + (second && /\d+\/\d+/.test(second) ? (' ' + second) : ''));
      if (!isNaN(maybeQty)) {
        qty = maybeQty;
        const startIdx = /\d+\/\d+/.test(second) ? 2 : 1;
        unit = tokens[startIdx] || '';
        name = tokens.slice(startIdx + (unit ? 1 : 0)).join(' ');
      } else {
        // No quantity, treat whole line as name
        name = raw;
      }
    }
    name = name.replace(/[,.;]+$/,'').trim();
    return { qty: isNaN(qty) ? null : qty, unit: unit || '', name: name || raw };
  }

  function normalizeName(n){ return (n||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }

  function aggregateIngredients(ingredientLines){
    const map = new Map();
    (ingredientLines||[]).forEach(line => {
      if (!line) return;
      const p = parseIngredient(line);
      const key = normalizeName(p.name) + '|' + (p.unit||'');
      const current = map.get(key) || { name: p.name, unit: p.unit||'', qty: 0, countNull: 0 };
      if (p.qty === null) current.countNull += 1; else current.qty += p.qty;
      map.set(key, current);
    });
    return Array.from(map.values()).map(item => {
      const qtyText = item.qty > 0 ? (Math.round(item.qty * 100) / 100).toString() : (item.countNull > 0 ? (item.countNull + 'x') : '');
      return { name: item.name, unit: item.unit, qty: item.qty > 0 ? item.qty : null, count: item.countNull, label: [qtyText, item.unit, item.name].filter(Boolean).join(' ').trim() };
    });
  }

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  function demoRecipes(){
    return [
      {
        id: uid(), title: 'Lemon Garlic Pasta', favorite: true, servings: 2, time: 20,
        description: 'Bright, zesty weeknight pasta with pantry staples.',
        tags: ['quick','vegetarian','pasta'],
        ingredients: ['200 g spaghetti','2 cloves garlic','1 tbsp olive oil','1 lemon','1/4 cup parmesan','salt','pepper'],
        steps: 'Boil pasta. Saute garlic in oil. Toss with lemon juice and zest. Add pasta water and cheese. Season and serve.'
      },
      {
        id: uid(), title: 'Hearty Lentil Soup', favorite: false, servings: 4, time: 35,
        description: 'Comforting, protein-rich soup perfect for make-ahead.',
        tags: ['soup','vegetarian','budget'],
        ingredients: ['1 cup lentils','1 onion','2 carrots','2 stalks celery','1 can tomatoes','1 tsp cumin','4 cups vegetable broth','salt'],
        steps: 'Sweat aromatics. Add spices, lentils, tomatoes, broth. Simmer until tender.'
      },
      {
        id: uid(), title: 'Sheet Pan Chicken & Veg', favorite: false, servings: 3, time: 30,
        description: 'Minimal dishes, maximum flavor.',
        tags: ['chicken','easy','sheet-pan'],
        ingredients: ['500 g chicken thighs','1 zucchini','1 red onion','1 bell pepper','2 tbsp olive oil','1 tsp paprika','salt','pepper'],
        steps: 'Toss chicken and veg with oil and spices. Roast at 425F until done.'
      }
    ];
  }

  window.App.Util = {
    uid, slugify, sanitize, parseIngredient, aggregateIngredients, days, demoRecipes
  };
})(window);
