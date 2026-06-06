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
    const tf = new Array(docs.length).fill(0); let df=0;
    for (let i=0;i<docs.length;i++){
      const hay=norm[i]; let c=0, idx=0;
      while ((idx = hay.indexOf(term, idx)) !== -1){ c++; idx += term.length; if (c>5000) break; }
      tf[i]=c; if (c>0) df++;
    }
    if (!df) continue;
    const idf = Math.log(1 + N/df);
    for (let i=0;i<docs.length;i++){ if (tf[i]>0) scores[i] += (1 + Math.log(tf[i])) * idf; }
  }
  return scores;
}

function greedyAllocate(sizes, order, budget){
  const take = new Array(sizes.length).fill(0); let remaining = budget;
  for (const i of order){
    if (remaining<=0) break;
    const want = sizes[i];
    if (want<=remaining){ take[i]=want; remaining-=want; } else { take[i]=remaining; remaining=0; }
  }
  return take;
}

function allocateBudget(sizes, budget){
  const n = sizes.length;
  const take = new Array(n).fill(0);
  if (n === 0 || budget <= 0) return take;
  const done = new Array(n).fill(false);
  let remaining = budget, left = n, changed = true;
  while (left > 0 && remaining > 0 && changed){
    changed = false;
    const share = Math.floor(remaining / left);
    if (share <= 0) break;
    for (let i=0;i<n;i++){
      if (done[i]) continue;
      if (sizes[i] <= share){ take[i]=sizes[i]; remaining-=sizes[i]; done[i]=true; left--; changed=true; }
    }
  }
  if (left > 0 && remaining > 0){
    const share = Math.floor(remaining / left);
    for (let i=0;i<n;i++){ if (!done[i]) take[i]=share; }
  }
  return take;
}

function buildContext(query){
  const all = state.docs;
  const incl = all.filter(d => d.included !== false);
  const excludedCount = all.length - incl.length;

  const manifest = incl.length
    ? incl.map((d,idx)=> (idx+1) + '. ' + d.name + (d.kind ? ' ['+d.kind+']' : '') + (d.size ? ' — '+humanSize(d.size) : '')).join('\n')
    : '(aucun document inclus dans le contexte)';

  const sizes = incl.map(d => (d.text||'').length);
  const scores = rankDocs(query, incl);
  const maxScore = scores.reduce((a,b)=>Math.max(a,b), 0);
  let take;
  if (maxScore > 0){
    const order = incl.map((_,i)=>i).sort((a,b)=> scores[b]-scores[a]);
    take = greedyAllocate(sizes, order, MAX_CONTEXT_CHARS);
  } else {
    take = allocateBudget(sizes, MAX_CONTEXT_CHARS);
  }

  const used=[]; let corpus='';
  for (let i=0;i<incl.length;i++){
    const d=incl[i]; const full=d.text||'';
    if (take[i] <= 0) continue;
    let body=full.slice(0, take[i]);
    if (body.length < full.length) body += '\n[…extrait tronqué : ' + body.length + '/' + full.length + ' caractères…]';
    corpus += '\n\n===== DOCUMENT : ' + d.name + (d.kind ? ' ['+d.kind+']' : '') + ' =====\n' + (body || '(contenu vide ou non textuel)');
    used.push(d.name);
  }

  const lengthRule = state.mode==='detaille'
    ? 'LONGUEUR : réponse complète mais sans verbiage ni répétition.'
    : 'LONGUEUR : réponse COURTE et PRÉCISE — 2 à 5 phrases maximum, ou une brève liste à puces. Va droit au but, aucune introduction ni formule superflue.';

  const prompt = [
    'Tu es MedChat, un assistant qui répond STRICTEMENT à partir des documents fournis par l\'utilisateur.',
    '',
    'Tu disposes de ' + incl.length + ' document(s) inclus' + (excludedCount ? (' (' + excludedCount + ' exclu(s) par l\'utilisateur, à ignorer)') : '') + '. INVENTAIRE COMPLET DES DOCUMENTS INCLUS :',
    manifest,
    '',
    'RÈGLES IMPÉRATIVES :',
    '1. FIDELITÉ ABSOLUE : réponds uniquement avec ce qui figure dans les documents ci-dessous. N\'invente rien, n\'extrapole pas, n\'ajoute aucune connaissance externe.',
    '2. Si l\'information ne figure pas dans les documents, réponds exactement : « Cette information ne figure pas dans les documents fournis. »',
    '3. SOURCE OBLIGATOIRE : pour chaque affirmation, indique le document source entre parenthèses (ex. : (source : rapport.pdf)). Termine TOUJOURS par une ligne « Sources : » suivie des noms des documents réellement utilisés. N\'invente jamais de source.',
    '4. ' + lengthRule,
    '5. Les documents les plus pertinents pour la question sont fournis en intégralité ; d\'autres peuvent être tronqués ou seulement listés dans l\'inventaire. Pour lister/compter/nommer les fichiers, fie-toi à l\'INVENTAIRE ci-dessus, jamais seulement aux extraits visibles.',
    '6. Réponds en français, sauf si la question est posée dans une autre langue.',
    '7. Tu aides à comprendre des documents et ne remplaces pas un avis médical professionnel.',
    '',
    '===== CONTENU DES DOCUMENTS =====',
    corpus.trim() || '(aucun contenu inclus — vérifiez votre sélection de documents)'
  ].join('\n');

  return { prompt, used, includedCount: incl.length, excludedCount };
}