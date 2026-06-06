'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let toastTimer;
function toast(msg){
  const t=$('#toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}

function show(screen){
  $('#setup').style.display = screen==='setup' ? 'flex' : 'none';
  $('#chat').style.display  = screen==='chat'  ? 'flex' : 'none';
}

function renderMarkdown(text){
  let h = esc(text);
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (m,l,c)=>'<pre><code>'+c.replace(/\n$/,'')+'</code></pre>');
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  h = h.replace(/^(#{1,6})\s+(.+)$/gm, '<strong>$2</strong>');
  return h;
}

function bubble(role, content, src){
  const el=document.createElement('div'); el.className='msg ' + (role==='user'?'user':'ai');
  const inner=document.createElement('div'); inner.className='bubble';
  if (role==='user') inner.textContent = content;
  else inner.innerHTML = renderMarkdown(content);
  el.appendChild(inner);
  if (role!=='user' && Array.isArray(src) && src.length){
    const meta=document.createElement('div'); meta.className='msg-meta';
    const shown = src.slice(0,6).map(esc).join(', ');
    const more = src.length>6 ? ' +'+(src.length-6)+' autre(s)' : '';
    meta.innerHTML = '<b>Documents consultés :</b> ' + shown + more;
    el.appendChild(meta);
  }
  return el;
}

function thinkingEl(){
  const el=document.createElement('div'); el.className='msg ai';
  el.innerHTML='<div class="bubble thinking"><span class="dots"><span></span><span></span><span></span></span></div>';
  return el;
}

function emptyState(){
  const wrap=document.createElement('div'); wrap.className='empty';
  wrap.innerHTML = '<div class="empty-icon">🩺</div>'
    + '<h2 class="empty-title">Posez une question sur vos documents</h2>'
    + '<p class="empty-sub">MedChat répond uniquement à partir des ' + state.docs.length + ' document(s) chargé(s), en citant ses sources.</p>'
    + '<div class="suggestions"></div>';
  const sg=wrap.querySelector('.suggestions');
  SUGGESTIONS.forEach(s=>{
    const b=document.createElement('button'); b.className='suggestion'; b.textContent=s;
    b.onclick=()=>{ const ta=$('#chatInput'); ta.value=s; autoResize(); send(); };
    sg.appendChild(b);
  });
  return wrap;
}

function scrollBottom(){ const box=$('#messages'); box.scrollTop=box.scrollHeight; }

function renderHistory(){
  const box=$('#messages'); box.innerHTML='';
  if (!state.hist.length){ box.appendChild(emptyState()); return; }
  state.hist.forEach(m => box.appendChild(bubble(m.role, m.content, m.src)));
  scrollBottom();
}