'use strict';

const STOP = new Set(('au aux avec ce ces dans de des du elle en et eux il je la le leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous est sont ete etre cette les plus tres avoir fait font ainsi donc alors entre sans sous chez the and or of to in on for with is are was were be been being this that these those it its as at by from into about over under can could should would will may might do does did done has have had not no yes if then else than them they we you he she his her our your their what which who whose how why where when').split(/\s+/));

function deburr(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g,''); }
function tokenize(s){ return deburr(String(s).toLowerCase()).split(/[^a-z0-9]+/).filter(w => w.length>=2 && !STOP.has(w)); }

function rankDocs(query, docs){
  const scores = new Array(docs.length).fill(0);
  const qTerms = Array.from(new Set(tokenize(query)));
  if (!qTerms.length || !docs.length) return scores;
  const norm = docs.map(d => deburr((d.text||'').toLowerCase()));
  const N = docs.length;
  for (const term of qTerms){
    const tf = new Array(docs.length).fill(0); let df = 0;
    for (let i = 0; i < docs.length; i++){
      const hay = norm[i]; let c = 0, idx = 0;
      while ((idx = hay.indexOf(term, idx)) !== -1){ c++; idx += term.length; if (c > 3000) break; }
      tf[i] = c; if (c > 0) df++;
    }
    if (!df) continue;
    const idf = Math.log(1 + N / df);
    for (let i = 0; i < docs.length; i++){ if (tf[i] > 0) scores[i] += (1 + Math.log(tf[i])) * idf; }
  }
  return scores;
}

function rankThemes(query, docs){
  const docScores = rankDocs(query, docs);
  const map = new Map();
  docs.forEach((d, i) => {
    const t = d.theme || 'Général';
    const e = map.get(t) || { theme: t, score: 0, idx: [] };
    e.score += docScores[i];
    e.idx.push(i);
    map.set(t, e);
  });
  return [...map.values()].sort((a, b) => b.score - a.score);
}

function greedyAllocate(sizes, order, budget){
  const take = new Array(sizes.length).fill(0); let remaining = budget;
  for (const i of order){
    if (remaining <= 0) break;
    const want = sizes[i];
    if (want <= remaining){ take[i] = want; remaining -= want; }
    else { take[i] = remaining; remaining = 0; }
  }
  return take;
}

function allocateBudget(sizes, budget){
  const n = sizes.length;
  const take = new Array(n).fill(0);
  if (!n || budget <= 0) return take;
  const done = new Array(n).fill(false);
  let remaining = budget, left = n, changed = true;
  while (left > 0 && remaining > 0 && changed){
    changed = false;
    const share = Math.floor(remaining / left);
    if (share <= 0) break;
    for (let i = 0; i < n; i++){
      if (done[i]) continue;
      if (sizes[i] <= share){ take[i] = sizes[i]; remaining -= sizes[i]; done[i] = true; left--; changed = true; }
    }
  }
  if (left > 0 && remaining > 0){
    const share = Math.floor(remaining / left);
    for (let i = 0; i < n; i++){ if (!done[i]) take[i] = share; }
  }
  return take;
}

/* Génère des suggestions de questions à partir des docs inclus */
function generateSuggestions(docs, n){
  const incl = docs.filter(d => d.included !== false);
  if (!incl.length) return [];
  const themes = [...new Set(incl.map(d => d.theme || 'Général'))];
  const names = incl.slice(0, 3).map(d => d.name.replace(/\.[^.]+$/, ''));
  const base = [
    'Résume les points clés' + (themes.length === 1 ? ' de ' + themes[0] : ''),
    'Quels sont les éléments les plus importants ?',
    'Y a-t-il des conclusions ou recommandations ?',
    'Quels problèmes ou enjeux sont soulevés ?',
    'Donne-moi les données chiffrées mentionnées',
    themes.length > 1 ? 'Quels thèmes sont disponibles ?' : 'Que contient ' + (names[0] || 'ce document') + ' ?',
    'Quelles sont les dates ou échéances évoquées ?',
    'Y a-t-il des risques ou avertissements mentionnés ?'
  ];
  for (let i = base.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.slice(0, n || 4);
}

/* forcedTheme : 'AUTO' = automatique */
function buildContext(query, forcedTheme){
  const allIncluded = state.docs.filter(d => d.included !== false);
  const allThemes = [...new Set(allIncluded.map(d => d.theme || 'Général'))];

  const ranked = rankThemes(query, allIncluded);
  let chosenTheme = null;
  if (forcedTheme && forcedTheme !== 'AUTO'){
    chosenTheme = forcedTheme;
  } else if (ranked.length && ranked[0].score > 0){
    chosenTheme = ranked[0].theme;
  }

  const allPool = chosenTheme
    ? allIncluded.filter(d => (d.theme || 'Général') === chosenTheme)
    : allIncluded;

  const poolScores = rankDocs(query, allPool);
  const poolOrder = allPool.map((_, i) => i).sort((a, b) => poolScores[b] - poolScores[a]);
  const pool = poolOrder.slice(0, MAX_DOCS_IN_POOL).map(i => allPool[i]);

  const sizes = pool.map(d => (d.text || '').length);
  const scores2 = rankDocs(query, pool);
  const max2 = scores2.reduce((a, b) => Math.max(a, b), 0);
  const order2 = pool.map((_, i) => i).sort((a, b) => scores2[b] - scores2[a]);
  const take = max2 > 0
    ? greedyAllocate(sizes, order2, MAX_CONTEXT_CHARS)
    : allocateBudget(sizes, MAX_CONTEXT_CHARS);

  const used = []; let corpus = '';
  for (let i = 0; i < pool.length; i++){
    const d = pool[i]; if (take[i] <= 0) continue;
    let body = (d.text || '').slice(0, take[i]);
    if (body.length < (d.text || '').length) body += '\n[…tronqué]';
    corpus += '\n\n=== ' + d.name + ' [' + (d.kind || 'DOC') + ']' + (chosenTheme ? '' : ' (thème: ' + (d.theme || 'Général') + ')') + ' ===\n' + (body || '(vide)');
    used.push(d.name);
  }

  const themeList = allThemes.map((t, k) => {
    const n = allIncluded.filter(d => (d.theme || 'Général') === t).length;
    return (k + 1) + '. ' + t + ' (' + n + ' doc' + (n > 1 ? 's' : '') + ')';
  }).join('\n');

  const isShort = state.mode !== 'detaille';
  const lengthRule = isShort
    ? 'LONGUEUR : maximum 4 phrases ou 5 puces. Aucune intro ni formule. Va direct au fait.'
    : 'LONGUEUR : complet mais sans répétition ni verbiage.';

  const prompt = [
    'Tu es SCHAET +. Tu réponds UNIQUEMENT à partir des documents ci-dessous.',
    '',
    'THÈMES (' + allThemes.length + ') : ' + allThemes.join(' | '),
    chosenTheme
      ? 'Thème sélectionné : ' + chosenTheme
      : 'Aucun thème dominant — tous les documents fournis.',
    '',
    'RÈGLES :',
    '1. Fidélité absolue : uniquement ce qui est dans les docs. Sinon : "Cette information n\'est pas dans les documents."',
    '2. Source entre parenthèses après chaque affirmation. Ex: (source: nom.pdf)',
    '3. ' + lengthRule,
    '4. Réponds en français. Format markdown simple (gras, listes) si utile.',
    '',
    '=== DOCUMENTS ===',
    corpus.trim() || '(aucun contenu)'
  ].join('\n');

  return { prompt, used, theme: chosenTheme, themes: allThemes };
}
