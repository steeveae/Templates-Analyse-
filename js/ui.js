'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':\'&#39;\'}[c])); }

let toastTimer;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function show(screen){
  $('#setup').style.display = screen === 'setup' ? 'flex' : 'none';
  $('#chat').style.display  = screen === 'chat'  ? 'flex' : 'none';
}

/* ── Markdown → HTML ── */
function renderMarkdown(text){
  let h = esc(text);
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, l, c) => '<pre><code>' + c.replace(/\n$/, '') + '</code></pre>');
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/^###\s+(.+)$/gm, '<div class="md-h3">$1</div>');
  h = h.replace(/^##\s+(.+)$/gm,  '<div class="md-h2">$1</div>');
  h = h.replace(/^#\s+(.+)$/gm,   '<div class="md-h1">$1</div>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
  h = h.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  h = h.replace(/^\d+\.\s+(.+)$/gm, '<oli>$1</oli>');
  h = h.replace(/(<oli>.*<\/oli>)/gs, s => '<ol>' + s.replace(/<\/?oli>/g, m => m.replace('oli','li')) + '</ol>');
  h = h.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
  return '<p>' + h + '</p>';
}

/* ── Bulle de message ── */
function bubble(role, content, src, theme){
  const el = document.createElement('div');
  el.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
  const inner = document.createElement('div');
  inner.className = 'bubble';
  if (role === 'user') inner.textContent = content;
  else inner.innerHTML = renderMarkdown(content);
  el.appendChild(inner);

  if (role !== 'user'){
    let parts = [];
    if (theme) parts.push('<span class="msg-theme">📁 ' + esc(theme) + '</span>');
    if (Array.isArray(src) && src.length){
      const shown = src.slice(0, 4).map(esc).join(', ');
      const more = src.length > 4 ? ' +' + (src.length - 4) : '';
      parts.push('<span class="msg-src">📄 ' + shown + more + '</span>');
    }
    if (parts.length){
      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.innerHTML = parts.join('');
      el.appendChild(meta);
    }
  }
  return el;
}

/* ── Bulle de streaming (modifiable) ── */
function streamBubble(){
  const el = document.createElement('div');
  el.className = 'msg ai';
  const inner = document.createElement('div');
  inner.className = 'bubble streaming';
  inner.innerHTML = '<span class="cursor"></span>';
  el.appendChild(inner);
  let full = '';
  return {
    el,
    append(chunk){
      full += chunk;
      inner.innerHTML = renderMarkdown(full) + '<span class="cursor"></span>';
      scrollBottom();
    },
    finalize(src, theme){
      inner.classList.remove('streaming');
      inner.innerHTML = renderMarkdown(full);
      let parts = [];
      if (theme) parts.push('<span class="msg-theme">📁 ' + esc(theme) + '</span>');
      if (Array.isArray(src) && src.length){
        const shown = src.slice(0, 4).map(esc).join(', ');
        const more = src.length > 4 ? ' +' + (src.length - 4) : '';
        parts.push('<span class="msg-src">📄 ' + shown + more + '</span>');
      }
      if (parts.length){
        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        meta.innerHTML = parts.join('');
        el.appendChild(meta);
      }
      return full;
    }
  };
}

function thinkingEl(){
  const el = document.createElement('div'); el.className = 'msg ai';
  el.innerHTML = '<div class="bubble thinking"><span class="dots"><span></span><span></span><span></span></span></div>';
  return el;
}

/* ── Empty state avec suggestions dynamiques ── */
function emptyState(){
  const wrap = document.createElement('div'); wrap.className = 'empty';
  const suggestions = generateSuggestions(state.docs, 4);
  wrap.innerHTML =
    '<div class="empty-logo">S+</div>'
  + '<h2 class="empty-title">Posez une question sur vos documents</h2>'
  + '<p class="empty-sub">SCHAET + utilise uniquement vos ' + state.docs.filter(d=>d.included!==false).length + ' document(s) inclus et cite ses sources.</p>'
  + '<div class="suggestions"></div>';
  const sg = wrap.querySelector('.suggestions');
  suggestions.forEach(s => {
    const b = document.createElement('button');
    b.className = 'suggestion';
    b.textContent = s;
    b.onclick = () => { const ta = $('#chatInput'); ta.value = s; autoResize(); send(); };
    sg.appendChild(b);
  });
  return wrap;
}

function scrollBottom(){ const box = $('#messages'); box.scrollTop = box.scrollHeight; }

/* ── Barre de thèmes 1 clic ── */
function renderThemeBar(){
  const bar = $('#themeBar'); if (!bar) return;
  const themes = [...new Set(state.docs.filter(d => d.included !== false).map(d => d.theme || 'Général'))];
  if (themes.length <= 1){ bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const sel = $('#themeSelect');
  const cur = sel ? sel.value : 'AUTO';
  bar.innerHTML = '';
  const auto = document.createElement('button');
  auto.className = 'theme-pill' + (cur === 'AUTO' ? ' active' : '');
  auto.textContent = '✦ Auto';
  auto.onclick = () => { if (sel) sel.value = 'AUTO'; renderThemeBar(); };
  bar.appendChild(auto);
  themes.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'theme-pill' + (cur === t ? ' active' : '');
    btn.textContent = '📁 ' + t;
    btn.onclick = () => { if (sel) sel.value = t; renderThemeBar(); };
    bar.appendChild(btn);
  });
}

/* ── Panneau historique latéral ── */
function renderSidebar(){
  const panel = $('#histPanel'); if (!panel) return;
  panel.innerHTML = '';
  if (!state.hist.length){
    panel.innerHTML = '<div class="hist-empty">Aucune conversation</div>';
    return;
  }
  const turns = state.hist.filter(m => m.role === 'user');
  turns.slice().reverse().forEach((m, i) => {
    const item = document.createElement('button');
    item.className = 'hist-item';
    item.textContent = m.content.length > 60 ? m.content.slice(0, 60) + '…' : m.content;
    item.onclick = () => {
      const msgs = $$('#messages .msg.user');
      const target = msgs[turns.length - 1 - i];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeSidebar();
    };
    panel.appendChild(item);
  });
}

function openSidebar(){
  const sb = $('#sidebar'); if (!sb) return;
  renderSidebar();
  sb.classList.add('open');
  $('#sidebarOverlay').classList.add('show');
}
function closeSidebar(){
  const sb = $('#sidebar'); if (!sb) return;
  sb.classList.remove('open');
  $('#sidebarOverlay').classList.remove('show');
}

function renderHistory(){
  const box = $('#messages'); box.innerHTML = '';
  if (!state.hist.length){ box.appendChild(emptyState()); return; }
  state.hist.forEach(m => box.appendChild(bubble(m.role, m.content, m.src, m.theme)));
  scrollBottom();
}
