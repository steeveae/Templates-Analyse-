'use strict';

const LS = {
  key:   'mc2_key',
  model: 'mc2_model',
  docs:  'mc2_docs',
  hist:  'mc2_hist',
  ready: 'mc2_ready',
  mode:  'mc2_mode'
};

const MODELS = [
  { id:'qwen/qwen3-coder:free',                       name:'Qwen3 Coder',           desc:'Modèle Qwen orienté code et raisonnement structuré.' },
  { id:'qwen/qwen3-next-80b-a3b-instruct:free',       name:'Qwen3 Next 80B',        desc:'Grand modèle instruct polyvalent, bon pour les textes longs.' },
  { id:'nvidia/nemotron-3-super-120b-a12b:free',      name:'Nemotron 3 Super 120B', desc:'Modèle NVIDIA très grande capacité, réponses détaillées.' },
  { id:'meta-llama/llama-3.3-70b-instruct:free',      name:'Llama 3.3 70B',         desc:'Meta Llama, robuste et équilibré pour le dialogue.' },
  { id:'google/gemma-4-31b-it:free',                  name:'Gemma 4 31B',           desc:'Google Gemma, rapide et léger.' },
  { id:'openrouter/free',                             name:'OpenRouter Auto',       desc:'Bascule automatiquement vers un modèle gratuit disponible. Recommandé en cas d\'erreur.' }
];

const DEFAULT_MODEL = 'openrouter/free';

const SUGGESTIONS = [
  'Résume les points clés des documents',
  'Quels diagnostics sont mentionnés ?',
  'Détaille les traitements et posologies évoqués',
  'Y a-t-il des contre-indications ou précautions ?'
];

const MAX_CONTEXT_CHARS = 120000;
const HISTORY_REQUEST  = 14;
const HISTORY_STORE    = 80;
const MAX_FILES        = 400;