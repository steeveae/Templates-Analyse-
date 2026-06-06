'use strict';

/* ── Streaming SSE → callback(chunk) appelé à chaque token ── */
async function callOpenRouterStream(messages, onChunk, onDone, onError){
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  const maxTok = MAX_TOKENS[state.mode] || MAX_TOKENS.court;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + state.key.trim(),
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://schaet.app',
        'X-Title': 'SCHAET +'
      },
      body: JSON.stringify({
        model: state.model,
        messages,
        max_tokens: maxTok,
        temperature: 0.15,
        stream: true
      }),
      signal: ctrl.signal
    });

    if (!res.ok) {
      let errMsg = 'HTTP ' + res.status;
      try { const d = await res.json(); errMsg = (d.error && d.error.message) || errMsg; } catch(_){}
      throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') { onDone(full); clearTimeout(timer); return; }
        try {
          const j = JSON.parse(data);
          const delta = j.choices?.[0]?.delta?.content;
          if (delta) { full += delta; onChunk(delta); }
        } catch(_) {}
      }
    }
    onDone(full);
  } catch(e) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') onError(new Error('Délai dépassé (60 s). Réessayez ou choisissez un modèle plus léger.'));
    else onError(e);
  } finally {
    clearTimeout(timer);
  }
}

function friendlyError(err){
  const m = (err && err.message) ? err.message : String(err);
  let extra = '';
  if (/provider returned error|no allowed providers|not available|no endpoints|429|503|502|404/i.test(m))
    extra = '\n\n💡 Choisissez **OpenRouter Auto** (bouton ⚡) qui bascule automatiquement.';
  else if (/401|invalid|unauthor|api key|no auth/i.test(m))
    extra = '\n\n💡 Vérifiez votre clé API dans ⚙️ Config.';
  else if (/expir|timeout|timed out|aborted|délai/i.test(m))
    extra = '\n\n💡 Réessayez ou choisissez **Gemma 4** ou **OpenRouter Auto**.';
  else if (/failed to fetch|networkerror|load failed/i.test(m))
    extra = '\n\n💡 Connexion impossible à OpenRouter. Vérifiez votre réseau.';
  return '⚠️ ' + m + extra;
}
