'use strict';

var state = {
  key:   lsGet(LS.key) || '',
  model: lsGet(LS.model) || DEFAULT_MODEL,
  docs:  load(LS.docs, []),
  hist:  load(LS.hist, []),
  mode:  (lsGet(LS.mode) === 'detaille') ? 'detaille' : 'court'
};
if (!MODELS.some(m => m.id === state.model)) state.model = DEFAULT_MODEL;
state.docs = Array.isArray(state.docs)
  ? state.docs.filter(d => d && typeof d === 'object' && typeof d.name === 'string')
              .map(d => ({ name:d.name, kind: typeof d.kind === 'string' ? d.kind : 'DOC', text: typeof d.text === 'string' ? d.text : '', size: typeof d.size === 'number' ? d.size : 0, truncated: !!d.truncated, included: d.included !== false }))
  : [];
state.hist = Array.isArray(state.hist)
  ? state.hist.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  : [];

function keyValid(){ const t=(state.key||'').trim(); return (t.startsWith('sk-') && t.length>=16) || t.length>=24; }

let uploading=false;
async function handleFiles(fileList){
  if (uploading){ toast('Traitement en cours, patientez un instant…'); return; }
  const incoming=[...fileList];
  const room = MAX_FILES - state.docs.length;
  if (room<=0){ toast('Limite de ' + MAX_FILES + ' fichiers atteinte'); return; }
  const batch = incoming.slice(0, room);
  if (incoming.length > room) toast('Limite de ' + MAX_FILES + ' fichiers : ' + room + ' ajouté(s) sur ' + incoming.length);

  uploading=true;
  const prog=$('#progress'); prog.style.display='block';
  const keyOf = f => (f.name||'') + ' ' + (f.size||0);
  const seen = new Set(state.docs.map(d => (d.name||'') + ' ' + (d.size||0)));
  try{
    for (let i=0;i<batch.length;i++){
      const f=batch[i];
      setProgress(i, batch.length, f.name);
      if (seen.has(keyOf(f))){ toast('« ' + f.name + ' » déjà chargé — ignoré'); setProgress(i+1, batch.length, f.name); continue; }
      try{
        const { kind, text } = await extractFile(f);
        const clean=(text||'').trim();
        if (!clean) toast('Aucun texte extrait de « ' + f.name + ' »');
        state.docs.push({ name:f.name, kind, text:clean, size:f.size });
        seen.add(keyOf(f));
      }catch(err){ toast('Échec : ' + f.name + ' — ' + ((err&&err.message)||err)); }
      setProgress(i+1, batch.length, f.name);
    }
    persistDocs(); renderChips(); updateLaunch(); updateDocCount();
  }finally{
    uploading=false;
    setTimeout(()=>{ prog.style.display='none'; $('#progressBar').style.width='0'; }, 500);
  }
}
function setProgress(done,total,name){
  const pct = total ? Math.round(done/total*100) : 0;
  $('#progressBar').style.width = pct + '%';
  $('#progressText').textContent = done>=total ? ('Terminé · ' + total + ' fichier(s)') : ('Traitement ' + (done+1) + '/' + total + ' — ' + name);
}

function renderChips(){
  const wrap=$('#chips'); wrap.innerHTML='';
  state.docs.forEach((d,i)=>{
    const sz = humanSize(typeof d.size==='number' && d.size>0 ? d.size : (d.text||'').length);
    const chip=document.createElement('div'); chip.className='chip';
    chip.innerHTML = '<span class="chip-kind">'+esc(d.kind||'DOC')+'</span>'
      + '<span class="chip-name" title="'+esc(d.name)+'">'+esc(d.name)+'</span>'
      + '<span class="chip-size"'+((d.savedTruncated||d.truncated)?' title="Texte partiellement sauvegardé (stockage plein)"':'')+'>'+esc(sz)+((d.savedTruncated||d.truncated)?' ✂':'')+'</span>'
      + '<button class="chip-x" data-i="'+i+'" aria-label="Supprimer">×</button>';
    wrap.appendChild(chip);
  });
  wrap.querySelectorAll('.chip-x').forEach(b=>{
    b.onclick=()=>{ state.docs.splice(+b.dataset.i,1); persistDocs(); renderChips(); updateLaunch(); updateDocCount(); };
  });
}

function updateLaunch(){ $('#launchBtn').disabled = !(keyValid() && state.docs.length>=1); }
function updateDocCount(){
  const n=state.docs.length;
  const el=$('#docCount'); if (el) el.textContent = n + ' doc' + (n>1?'s':'');
}
function updateModelLabel(){ const m=MODELS.find(x=>x.id===state.model); const el=$('#modelLbl'); if (el) el.textContent = m ? m.name : 'Modèle'; }

let busy=false;
function setSendEnabled(b){ $('#btnSend').disabled = !b; }
async function send(){
  const ta=$('#chatInput'); const text=ta.value.trim();
  if (!text || busy) return;
  if (!keyValid()){ toast('Clé API manquante — ouvrez ⚙️ Config'); return; }

  const box=$('#messages');
  const empty=box.querySelector('.empty'); if (empty) empty.remove();

  state.hist.push({ role:'user', content:text }); persistHist();
  box.appendChild(bubble('user', text));
  ta.value=''; autoResize(); scrollBottom();

  busy=true; setSendEnabled(false);
  const think=thinkingEl(); box.appendChild(think); scrollBottom();
  try{
    const ctx = buildContext(text);
    const messages = [{ role:'system', content: ctx.prompt }].concat(state.hist.slice(-HISTORY_REQUEST));
    const reply = await callOpenRouter(messages);
    think.remove();
    const msg = { role:'assistant', content:reply };
    if (ctx.used && ctx.used.length) msg.src = ctx.used.slice();
    state.hist.push(msg); persistHist();
    box.appendChild(bubble('assistant', reply, msg.src)); scrollBottom();
  }catch(err){
    think.remove();
    const b=bubble('assistant', friendlyError(err)); b.querySelector('.bubble').classList.add('error');
    box.appendChild(b); scrollBottom();
  }finally{
    busy=false; setSendEnabled(true); ta.focus();
  }
}

function autoResize(){ const ta=$('#chatInput'); ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,200)+'px'; }

function openModelModal(){
  const list=$('#modelList'); list.innerHTML='';
  MODELS.forEach(m=>{
    const item=document.createElement('button');
    item.className='model-item' + (m.id===state.model ? ' active' : '');
    const badge = m.id===DEFAULT_MODEL ? '<span class="badge">auto</span>' : '';
    item.innerHTML = '<div class="model-name">'+esc(m.name)+badge+'</div>'
      + '<div class="model-id">'+esc(m.id)+'</div>'
      + '<div class="model-desc">'+esc(m.desc)+'</div>';
    item.onclick=()=>{ state.model=m.id; persistModel(); updateModelLabel(); closeModelModal(); toast('Modèle : ' + m.name); };
    list.appendChild(item);
  });
  $('#modelModal').classList.add('open');
}
function closeModelModal(){ $('#modelModal').classList.remove('open'); }

function includedCount(){ return state.docs.reduce((n,d)=> n + (d.included!==false?1:0), 0); }
function updateCtxPill(){ const el=$('#ctxPill'); if (!el) return; const total=state.docs.length, inc=includedCount(); el.textContent = total ? ('Contexte : ' + inc + '/' + total + ' doc' + (inc>1?'s':'')) : 'Aucun document'; }
function setModeUI(){ const a=$('#modeCourt'), b=$('#modeDetaille'); if (a) a.classList.toggle('active', state.mode!=='detaille'); if (b) b.classList.toggle('active', state.mode==='detaille'); }
function openDocsModal(){ renderDocsList(); const s=$('#docsSearch'); if (s) s.value=''; $('#docsModal').classList.add('open'); }
function closeDocsModal(){ $('#docsModal').classList.remove('open'); }
function refreshDocsCount(){ const c=$('#docsCount'); if (c) c.innerHTML='<b>'+includedCount()+'</b> / '+state.docs.length+' document(s) inclus dans le contexte'; }

function renderDocsList(filter){
  const list=$('#docsList'); if (!list) return; list.innerHTML='';
  const q=(filter||'').trim().toLowerCase();
  refreshDocsCount();
  if (!state.docs.length){ list.innerHTML='<div class="docs-empty">Aucun document. Ajoutez-en via ⚙️ Config.</div>'; return; }
  let shown=0;
  state.docs.forEach((d,i)=>{
    if (q && d.name.toLowerCase().indexOf(q)===-1) return;
    shown++;
    const sz=humanSize(typeof d.size==='number' && d.size>0 ? d.size : (d.text||'').length);
    const row=document.createElement('div'); row.className='doc-row' + (d.included===false?' excluded':'');
    row.innerHTML =
      '<input class="doc-cb" type="checkbox" data-i="'+i+'" '+(d.included===false?'':'checked')+' aria-label="Inclure dans le contexte">'
      + '<div class="doc-main"><div class="doc-head" data-toggle="'+i+'">'
      +   '<span class="doc-badge">'+esc(d.kind||'DOC')+'</span>'
      +   '<span class="doc-title" title="'+esc(d.name)+'">'+esc(d.name)+'</span>'
      +   '<span class="doc-meta">'+esc(sz)+'</span>'
      + '</div></div>'
      + '<button class="doc-del" data-del="'+i+'" title="Supprimer" aria-label="Supprimer">🗑</button>';
    list.appendChild(row);
  });
  if (!shown){ list.innerHTML='<div class="docs-empty">Aucun document ne correspond à « '+esc(q)+' ».</div>'; return; }
  list.querySelectorAll('.doc-cb').forEach(cb=>{
    cb.onchange=()=>{ const i=+cb.dataset.i; state.docs[i].included=cb.checked; persistDocs();
      const row=cb.closest('.doc-row'); if (row) row.classList.toggle('excluded', !cb.checked);
      refreshDocsCount(); updateCtxPill(); };
  });
  list.querySelectorAll('.doc-head').forEach(h=>{ h.onclick=()=>togglePreview(h, +h.dataset.toggle); });
  list.querySelectorAll('.doc-del').forEach(b=>{
    b.onclick=()=>{ const i=+b.dataset.del; if (!confirm('Supprimer « '+state.docs[i].name+' » ?')) return;
      state.docs.splice(i,1); persistDocs(); renderDocsList($('#docsSearch') ? $('#docsSearch').value : '');
      renderChips(); updateDocCount(); updateLaunch(); updateCtxPill(); };
  });
}
function togglePreview(head, i){
  const main=head.parentNode; const ex=main.querySelector('.doc-preview');
  if (ex){ ex.remove(); return; }
  const pv=document.createElement('div'); pv.className='doc-preview';
  const full=state.docs[i] ? (state.docs[i].text||'') : '';
  pv.textContent = full ? (full.slice(0,1200) + (full.length>1200 ? '\n…' : '')) : '(aucun texte extrait)';
  main.appendChild(pv);
}

function enterChat(){ show('chat'); updateDocCount(); updateModelLabel(); setModeUI(); updateCtxPill(); renderHistory(); $('#chatInput').focus(); }

let deferredInstallPrompt = null;
function initPWA(){
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = $('#installBanner');
    if (banner) banner.classList.add('show');
  });
  const btnInstall = $('#btnInstall');
  if (btnInstall){
    btnInstall.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      const banner = $('#installBanner');
      if (banner) banner.classList.remove('show');
    });
  }
  const btnDismiss = $('#btnInstallDismiss');
  if (btnDismiss){
    btnDismiss.addEventListener('click', () => {
      const banner = $('#installBanner');
      if (banner) banner.classList.remove('show');
    });
  }
  window.addEventListener('appinstalled', () => {
    const banner = $('#installBanner');
    if (banner) banner.classList.remove('show');
    deferredInstallPrompt = null;
  });
}

function init(){
  if (window.pdfjsLib){
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const dl=$('#docLimit'); if (dl) dl.textContent=String(MAX_FILES);
  if (!storageAvailable()) toast('Stockage local indisponible — vos données ne seront pas conservées entre les sessions.');

  const sel=$('#modelSelect');
  MODELS.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name+' — '+m.id; sel.appendChild(o); });
  sel.value=state.model;
  sel.addEventListener('change', e=>{ state.model=e.target.value; persistModel(); updateModelLabel(); });

  const keyInput=$('#apiKey'); keyInput.value=state.key;
  keyInput.addEventListener('input', e=>{ state.key=e.target.value; persistKey(); updateLaunch(); });
  $('#keyToggle').addEventListener('click', ()=>{
    const show = keyInput.type==='password';
    keyInput.type = show ? 'text' : 'password';
    $('#keyToggle').textContent = show ? 'Masquer' : 'Afficher';
  });

  const dz=$('#dropzone');
  dz.addEventListener('click', ()=>$('#fileInput').click());
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.add('drag'); }));
  dz.addEventListener('dragleave', e=>{ if (!dz.contains(e.relatedTarget)) dz.classList.remove('drag'); });
  dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });
  $('#fileInput').addEventListener('change', e=>{ if (e.target.files && e.target.files.length) handleFiles(e.target.files); e.target.value=''; });

  $('#launchBtn').addEventListener('click', ()=>{
    state.key = $('#apiKey').value.trim(); persistKey();
    if (!keyValid() || state.docs.length<1) return;
    try{ lsSet(LS.ready,'1'); }catch(e){}
    enterChat();
  });

  $('#resetLink').addEventListener('click', e=>{
    e.preventDefault();
    if (!confirm('Réinitialiser MedChat ? La clé API, les documents et l\'historique seront effacés.')) return;
    [LS.key,LS.model,LS.docs,LS.hist,LS.ready,LS.mode].forEach(k=>lsRemove(k));
    state={ key:'', model:DEFAULT_MODEL, docs:[], hist:[], mode:'court' };
    $('#apiKey').value=''; $('#apiKey').type='password'; $('#keyToggle').textContent='Afficher';
    sel.value=DEFAULT_MODEL; renderChips(); updateLaunch(); updateDocCount(); updateModelLabel(); updateCtxPill(); setModeUI();
    toast('MedChat réinitialisé');
  });

  $('#btnModel').addEventListener('click', openModelModal);
  $('#btnNew').addEventListener('click', ()=>{
    if (state.hist.length && !confirm('Démarrer une nouvelle conversation ? L\'historique actuel sera effacé.')) return;
    state.hist=[]; persistHist(); renderHistory();
  });
  $('#btnConfig').addEventListener('click', ()=>{
    $('#apiKey').value=state.key; sel.value=state.model;
    renderChips(); updateLaunch(); updateDocCount(); show('setup');
    const su=$('#setup'); if (su) su.scrollTop=0;
  });

  $('#modelClose').addEventListener('click', closeModelModal);
  $('#modelModal').addEventListener('click', e=>{ if (e.target.id==='modelModal') closeModelModal(); });
  document.addEventListener('keydown', e=>{ if (e.key==='Escape'){ closeModelModal(); closeDocsModal(); } });

  const ta=$('#chatInput');
  ta.addEventListener('input', autoResize);
  ta.addEventListener('keydown', e=>{ if (e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); send(); } });
  $('#btnSend').addEventListener('click', send);

  $('#btnDocs').addEventListener('click', openDocsModal);
  $('#docsClose').addEventListener('click', closeDocsModal);
  $('#docsModal').addEventListener('click', e=>{ if (e.target.id==='docsModal') closeDocsModal(); });
  $('#docsSearch').addEventListener('input', e=>renderDocsList(e.target.value));
  $('#docsAll').addEventListener('click', ()=>{ state.docs.forEach(d=>d.included=true); persistDocs(); renderDocsList($('#docsSearch').value); updateCtxPill(); });
  $('#docsNone').addEventListener('click', ()=>{ state.docs.forEach(d=>d.included=false); persistDocs(); renderDocsList($('#docsSearch').value); updateCtxPill(); });

  $('#modeCourt').addEventListener('click', ()=>{ state.mode='court'; persistMode(); setModeUI(); });
  $('#modeDetaille').addEventListener('click', ()=>{ state.mode='detaille'; persistMode(); setModeUI(); });

  renderChips(); updateLaunch(); updateDocCount(); updateModelLabel();

  initPWA();

  if (lsGet(LS.ready)==='1') enterChat();
  else show('setup');
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();