'use strict';

function isQuota(e){
  return !!e && (e.name==='QuotaExceededError' || e.name==='NS_ERROR_DOM_QUOTA_REACHED' || e.code===22 || e.code===1014 || /quota|exceeded/i.test(e.message||''));
}

function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ if (isQuota(e)) throw e; return false; } }
function lsRemove(k){ try{ localStorage.removeItem(k); }catch(e){} }
function storageAvailable(){
  try{ const k='__mc_test__'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; }
  catch(e){ return false; }
}

function load(k, fb){
  try{
    const raw = lsGet(k);
    if (raw == null) return fb;
    const v = JSON.parse(raw);
    return v == null ? fb : v;
  }catch(e){ return fb; }
}

function persistKey(){ try{ lsSet(LS.key, state.key); }catch(e){} }
function persistModel(){ try{ lsSet(LS.model, state.model); }catch(e){} }
function persistMode(){ try{ lsSet(LS.mode, state.mode); }catch(e){} }

function persistDocs(){
  const snap = state.docs.map(d => ({
    name: d.name, kind: d.kind||'DOC', text: d.text||'',
    size: d.size||0, truncated: !!d.truncated, included: d.included !== false
  }));
  function syncFlags(){ state.docs.forEach((d,j)=>{ d.savedTruncated = !!(snap[j] && snap[j].truncated); }); }
  for (let pass=0; pass<300; pass++){
    try{
      lsSet(LS.docs, JSON.stringify(snap));
      syncFlags();
      return;
    }catch(e){
      if (!isQuota(e)){ console.error('persistDocs:', e); return; }
      let idx=-1, max=0;
      snap.forEach((d,j)=>{ if (d.text.length > max){ max=d.text.length; idx=j; } });
      if (idx<0 || max<=400){ toast('Stockage saturé : sauvegarde partielle des documents.'); syncFlags(); return; }
      snap[idx].text = snap[idx].text.slice(0, Math.floor(max*0.75));
      snap[idx].truncated = true;
    }
  }
}

function persistHist(){
  state.hist = state.hist.slice(-HISTORY_STORE);
  try{ lsSet(LS.hist, JSON.stringify(state.hist)); }
  catch(e){
    state.hist = state.hist.slice(-30);
    try{ lsSet(LS.hist, JSON.stringify(state.hist)); }catch(_){}
  }
}