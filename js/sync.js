'use strict';

var _sb = null;
var _sbUser = null;

function syncReady(){ return !!_sb; }
function syncLoggedIn(){ return !!_sb && !!_sbUser; }
function syncCurrentUser(){ return _sbUser; }

async function syncInit(){
  const url = lsGet(LS.sbUrl);
  const key = lsGet(LS.sbKey);
  if (!url || !key) return false;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return false;
  try {
    _sb = window.supabase.createClient(url.trim(), key.trim(), {
      auth: { storageKey: 'sc_sb_auth', persistSession: true }
    });
    const { data: { session } } = await _sb.auth.getSession();
    _sbUser = session ? session.user : null;
    _sb.auth.onAuthStateChange((_event, session) => {
      _sbUser = session ? session.user : null;
      _updateSyncUI();
    });
    return true;
  } catch(e){
    console.warn('syncInit:', e.message);
    _sb = null;
    return false;
  }
}

async function syncLogin(email, password){
  if (!_sb) throw new Error('Configurez d\'abord l\'URL Supabase et la clé anon.');
  const { data, error } = await _sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _sbUser = data.user;
  return data;
}

async function syncSignup(email, password){
  if (!_sb) throw new Error('Configurez d\'abord l\'URL Supabase et la clé anon.');
  const { data, error } = await _sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function syncLogout(){
  if (!_sb) return;
  await _sb.auth.signOut();
  _sbUser = null;
}

async function syncPullDocs(){
  if (!syncLoggedIn()) return [];
  const { data, error } = await _sb
    .from('schaet_documents')
    .select('name,kind,text,size,truncated,included,theme')
    .order('updated_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function syncPushDoc(doc){
  if (!syncLoggedIn()) return;
  const { error } = await _sb.from('schaet_documents').upsert({
    user_id:    _sbUser.id,
    name:       doc.name,
    kind:       doc.kind     || 'DOC',
    text:       doc.text     || '',
    size:       doc.size     || 0,
    truncated:  !!doc.truncated,
    included:   doc.included !== false,
    theme:      doc.theme    || 'Général',
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,name' });
  if (error) console.warn('syncPushDoc:', error.message);
}

async function syncDeleteDoc(name){
  if (!syncLoggedIn()) return;
  const { error } = await _sb.from('schaet_documents')
    .delete()
    .eq('user_id', _sbUser.id)
    .eq('name', name);
  if (error) console.warn('syncDeleteDoc:', error.message);
}

async function syncDeleteAllDocs(){
  if (!syncLoggedIn()) return;
  const { error } = await _sb.from('schaet_documents')
    .delete()
    .eq('user_id', _sbUser.id);
  if (error) console.warn('syncDeleteAllDocs:', error.message);
}

async function syncResendConfirmation(email){
  if (!_sb) throw new Error('Configurez d\'abord l\'URL Supabase et la clé anon.');
  const { error } = await _sb.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

function _updateSyncUI(){
  const loginArea  = document.getElementById('loginArea');
  const loggedArea = document.getElementById('loggedInArea');
  const emailEl    = document.getElementById('syncUserEmail');
  const syncDot    = document.getElementById('syncDot');

  if (_sbUser){
    if (loginArea)  loginArea.style.display  = 'none';
    if (loggedArea) loggedArea.style.display = 'flex';
    if (emailEl)    emailEl.textContent = _sbUser.email;
    if (syncDot)    syncDot.classList.add('active');
  } else {
    if (loginArea)  loginArea.style.display  = 'flex';
    if (loggedArea) loggedArea.style.display = 'none';
    if (syncDot)    syncDot.classList.remove('active');
  }
}
