'use strict';

const LS = {
  key:      'sc_key',
  model:    'sc_model',
  docs:     'sc_docs',
  hist:     'sc_hist',
  ready:    'sc_ready',
  mode:     'sc_mode',
  sidebar:  'sc_sidebar',
  sbUrl:    'sc_sb_url',
  sbKey:    'sc_sb_key'
};

const MODELS = [
  { id:'google/gemma-4-31b-it:free',                  name:'Gemma 4 31B',           desc:'Google Gemma — rapide et léger. ⚡ Recommandé.' },
  { id:'meta-llama/llama-3.3-70b-instruct:free',      name:'Llama 3.3 70B',         desc:'Meta Llama — robuste et équilibré.' },
  { id:'qwen/qwen3-coder:free',                       name:'Qwen3 Coder',           desc:'Qwen orienté raisonnement structuré.' },
  { id:'qwen/qwen3-next-80b-a3b-instruct:free',       name:'Qwen3 Next 80B',        desc:'Grand modèle Qwen, bon pour les textes longs.' },
  { id:'nvidia/nemotron-3-super-120b-a12b:free',      name:'Nemotron 3 Super 120B', desc:'NVIDIA très grande capacité.' },
  { id:'openrouter/free',                             name:'OpenRouter Auto',       desc:'Bascule automatiquement. Recommandé en cas d\'erreur.' }
];

const DEFAULT_MODEL = 'google/gemma-4-31b-it:free';

/* Tokens max selon le mode */
const MAX_TOKENS = { court: 500, detaille: 1400 };

/* Budget contexte réduit — top-3 docs max en mode court */
const MAX_CONTEXT_CHARS = 40000;
const MAX_DOCS_IN_POOL  = 5;   /* jamais plus de 5 docs envoyés au modèle */

const HISTORY_REQUEST = 6;   /* seulement 3 tours de conversation */
const HISTORY_STORE   = 60;
const MAX_FILES       = 400;
