'use strict';

async function callOpenRouter(messages){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), 90000);
  let res;
  try{
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization':'Bearer ' + state.key.trim(),
        'Content-Type':'application/json',
        'HTTP-Referer':'https://medchat.app',
        'X-Title':'MedChat'
      },
      body: JSON.stringify({ model: state.model, messages, max_tokens: 2048, temperature: 0.2 }),
      signal: ctrl.signal
    });
  }catch(e){
    if (e && e.name === 'AbortError') throw new Error('La requête a expiré (délai de 90 s dépassé).');
    throw e;
  }finally{
    clearTimeout(timer);
  }
  let data=null;
  try{ data = await res.json(); }catch(e){}
  if (!res.ok){
    const d = (data && data.error) ? (data.error.message || JSON.stringify(data.error)) : ('HTTP ' + res.status);
    throw new Error(d);
  }
  if (data && data.error) throw new Error(data.error.message || 'Provider returned error');
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (content == null) throw new Error('Réponse vide du modèle');
  return content;
}

function friendlyError(err){
  const m = (err && err.message) ? err.message : String(err);
  let extra='';
  if (/provider returned error|provider error|no allowed providers|not available|no endpoints|429|503|502|404/i.test(m))
    extra = '\n\n💡 Ce modèle peut refuser la requête ou être momentanément indisponible. Cliquez sur ⚡ et choisissez « OpenRouter Auto », qui bascule automatiquement vers un modèle gratuit disponible.';
  else if (/401|invalid|unauthor|api key|no auth/i.test(m))
    extra = '\n\n💡 Vérifiez votre clé API dans ⚙️ Config.';
  else if (/expir|timeout|timed out|aborted/i.test(m))
    extra = '\n\n💡 Le serveur a mis trop de temps à répondre. Réessayez, ou choisissez « OpenRouter Auto » / un modèle plus léger.';
  else if (/failed to fetch|networkerror|load failed/i.test(m))
    extra = '\n\n💡 Connexion impossible à OpenRouter. Vérifiez votre réseau.';
  return '⚠️ Erreur : ' + m + extra;
}