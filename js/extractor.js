'use strict';

async function inflateRaw(u8){
  if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream non supporté par ce navigateur');
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([u8]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

function humanSize(n){
  if (n == null) return '?';
  const u=['o','Ko','Mo','Go','To']; let i=0, v=n;
  while (v>=1024 && i<u.length-1){ v/=1024; i++; }
  return (i ? v.toFixed(1) : v) + ' ' + u[i];
}
function magic(head, sig){ for (let i=0;i<sig.length;i++){ if (head[i]!==sig[i]) return false; } return true; }

async function readTextSmart(file){
  const u8 = new Uint8Array(await file.arrayBuffer());
  let enc='utf-8';
  if (u8[0]===0xFF && u8[1]===0xFE) enc='utf-16le';
  else if (u8[0]===0xFE && u8[1]===0xFF) enc='utf-16be';
  try{ return new TextDecoder(enc, { fatal:false }).decode(u8); }
  catch(e){ return new TextDecoder('utf-8', { fatal:false }).decode(u8); }
}

function looksLikeText(head){
  const n = Math.min(head.length, 8192);
  if (n === 0) return true;
  if ((head[0]===0xFF && head[1]===0xFE) || (head[0]===0xFE && head[1]===0xFF)) return true;
  let bad = 0;
  for (let i=0;i<n;i++){
    const b = head[i];
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) bad++;
  }
  return bad / n < 0.1;
}

function extractTextNodes(xml){
  try{
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('xml');
    let out = '';
    (function walk(node){
      let c = node.firstChild;
      while (c){
        if (c.nodeType === 1){
          const n = c.localName;
          if (n==='t') out += c.textContent;
          else if (n==='tab') out += '\t';
          else if (n==='br' || n==='cr') out += '\n';
          else if (n==='p'){ walk(c); out += '\n'; }
          else walk(c);
        }
        c = c.nextSibling;
      }
    })(doc.documentElement);
    return out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }catch(e){
    const parts=[]; const re=/<(?:w|a):t\b[^>]*>([\s\S]*?)<\/(?:w|a):t>/g; let m;
    while ((m=re.exec(xml))) parts.push(m[1]);
    const ta=document.createElement('textarea'); ta.innerHTML=parts.join(' '); return ta.value.trim();
  }
}

function htmlToText(html){
  try{
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript,template').forEach(n=>n.remove());
    const t = (doc.body || doc.documentElement).textContent || '';
    return t.replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  }catch(e){ return html; }
}

function stripRtf(rtf){
  if (!rtf) return '';
  let s = rtf;
  s = s.replace(/\\par[d]?\b/g, '\n');
  s = s.replace(/\\tab\b/g, '\t');
  s = s.replace(/\\' ([0-9a-fA-F]{2})/g, (m,h)=>{ try{ return String.fromCharCode(parseInt(h,16)); }catch(e){ return ''; } });
  s = s.replace(/\\u(-?\d+)\s?\??/g, (m,d)=>{ let c=parseInt(d,10); if (c<0) c+=65536; try{ return String.fromCharCode(c); }catch(e){ return ''; } });
  s = s.replace(/\{\\\*[\s\S]*?\}/g, '');
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, '');
  s = s.replace(/[{}]/g, '');
  return s.replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
}

function parseZip(arrayBuffer){
  const dv=new DataView(arrayBuffer), u8=new Uint8Array(arrayBuffer), len=dv.byteLength;
  let eocd=-1; const back=Math.min(len, 65557);
  for (let i=len-22; i>=len-back && i>=0; i--){ if (dv.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if (eocd<0) throw new Error('archive ZIP invalide');
  const cdCount=dv.getUint16(eocd+10,true), cdOff=dv.getUint32(eocd+16,true);
  const dec=new TextDecoder();
  const entries=[]; let p=cdOff;
  for (let i=0;i<cdCount && p+46<=len;i++){
    if (dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true);
    const compSize=dv.getUint32(p+20,true);
    const nameLen=dv.getUint16(p+28,true);
    const extraLen=dv.getUint16(p+30,true);
    const commLen=dv.getUint16(p+32,true);
    const localOff=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46, p+46+nameLen));
    entries.push({ name, method, compSize, localOff });
    p += 46 + nameLen + extraLen + commLen;
  }
  return { dv, u8, entries };
}
async function inflateEntry(zip, entry){
  const { dv, u8 } = zip; const lo=entry.localOff;
  if (dv.getUint32(lo,true)!==0x04034b50) throw new Error('en-tête ZIP local invalide');
  const lNameLen=dv.getUint16(lo+26,true), lExtraLen=dv.getUint16(lo+28,true);
  const start=lo+30+lNameLen+lExtraLen;
  const comp=u8.subarray(start, start+entry.compSize);
  if (entry.method===0) return comp;
  if (entry.method===8) return await inflateRaw(comp);
  throw new Error('compression ZIP non gérée (méthode ' + entry.method + ')');
}
async function entryText(zip, entry){ return new TextDecoder('utf-8').decode(await inflateEntry(zip, entry)); }
function numIn(name, re){ const m=name.match(re); return m ? +m[1] : 0; }

async function docxFromZip(zip){
  const main = zip.entries.find(e=>e.name==='word/document.xml');
  if (!main) throw new Error('word/document.xml introuvable');
  const parts = [ extractTextNodes(await entryText(zip, main)) ];
  for (const nm of ['word/footnotes.xml','word/endnotes.xml']){
    const e = zip.entries.find(x=>x.name===nm);
    if (e){ try{ const t = extractTextNodes(await entryText(zip, e)).trim(); if (t) parts.push('\n[' + nm.split('/').pop().replace('.xml','') + ']\n' + t); }catch(_){} }
  }
  return parts.join('\n').trim();
}
async function pptxFromZip(zip){
  const slides = zip.entries.filter(e=>/^ppt\/slides\/slide\d+\.xml$/.test(e.name))
                            .sort((a,b)=>numIn(a.name,/slide(\d+)\.xml$/)-numIn(b.name,/slide(\d+)\.xml$/));
  if (!slides.length) throw new Error('aucune diapositive');
  const out=[];
  for (let i=0;i<slides.length;i++){
    let t=''; try{ t = extractTextNodes(await entryText(zip, slides[i])).trim(); }catch(_){}
    out.push('--- Diapositive ' + (i+1) + ' ---' + (t ? '\n'+t : ' (sans texte)'));
  }
  return out.join('\n\n').trim();
}
async function xlsxFromZip(zip){
  const shared=[];
  const ss = zip.entries.find(e=>e.name==='xl/sharedStrings.xml');
  if (ss){
    try{
      const doc = new DOMParser().parseFromString(await entryText(zip, ss), 'application/xml');
      const sis = doc.getElementsByTagName('si');
      for (let i=0;i<sis.length;i++){
        const ts = sis[i].getElementsByTagName('t'); let s='';
        for (let j=0;j<ts.length;j++) s += ts[j].textContent;
        shared.push(s);
      }
    }catch(_){}
  }
  const sheets = zip.entries.filter(e=>/^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
                            .sort((a,b)=>numIn(a.name,/sheet(\d+)\.xml$/)-numIn(b.name,/sheet(\d+)\.xml$/));
  if (!sheets.length) throw new Error('aucune feuille de calcul');
  const out=[];
  for (let s=0;s<sheets.length;s++){
    let doc; try{ doc = new DOMParser().parseFromString(await entryText(zip, sheets[s]), 'application/xml'); }catch(_){ continue; }
    const rows = doc.getElementsByTagName('row'); const lines=[];
    for (let r=0;r<rows.length;r++){
      const cells = rows[r].getElementsByTagName('c'); const vals=[];
      for (let c=0;c<cells.length;c++){
        const cell=cells[c], type=cell.getAttribute('t'); let val='';
        if (type==='s'){ const v=cell.getElementsByTagName('v')[0]; const idx=v?parseInt(v.textContent,10):NaN; val=(!isNaN(idx)&&idx<shared.length)?shared[idx]:''; }
        else if (type==='inlineStr'){ const is=cell.getElementsByTagName('t'); let s2=''; for (let k=0;k<is.length;k++) s2+=is[k].textContent; val=s2; }
        else { const v=cell.getElementsByTagName('v')[0]; val=v?v.textContent:''; }
        if (val!=='') vals.push(val);
      }
      if (vals.length) lines.push(vals.join('\t'));
    }
    if (lines.length) out.push('--- Feuille ' + (s+1) + ' ---\n' + lines.join('\n'));
  }
  return out.join('\n\n').trim() || '(feuille(s) vide(s))';
}
async function readZipDocument(arrayBuffer){
  const zip = parseZip(arrayBuffer);
  const names = zip.entries.map(e=>e.name);
  if (names.indexOf('word/document.xml') !== -1) return { kind:'DOCX', text: await docxFromZip(zip) };
  if (names.some(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n))) return { kind:'PPTX', text: await pptxFromZip(zip) };
  if (names.indexOf('xl/workbook.xml') !== -1) return { kind:'XLSX', text: await xlsxFromZip(zip) };
  const files = names.filter(n=>!n.endsWith('/'));
  return { kind:'ZIP', text: '[Archive ZIP — ' + files.length + ' fichier(s) :]\n' + files.join('\n'), binary:true };
}

async function readPdf(arrayBuffer){
  if (!window.pdfjsLib) throw new Error('pdf.js non chargé (vérifiez la connexion)');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const out=[];
  for (let i=1;i<=pdf.numPages;i++){
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out.push(tc.items.map(it => (it && typeof it.str==='string') ? it.str : '').join(' '));
  }
  return out.join('\n').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}

const TEXT_EXT = new Set(['txt','text','md','markdown','mdx','csv','tsv','json','jsonl','ndjson','geojson','xml','svg','yaml','yml','toml','ini','cfg','conf','config','properties','env','log','htm','html','css','scss','sass','less','js','mjs','cjs','jsx','ts','tsx','vue','svelte','py','pyw','rb','php','java','kt','kts','c','h','cpp','cxx','cc','hpp','hh','cs','go','rs','swift','m','mm','scala','clj','cljs','ex','exs','erl','hs','lua','pl','pm','r','jl','dart','sh','bash','zsh','fish','bat','cmd','ps1','sql','graphql','gql','proto','tex','rst','adoc','asciidoc','srt','vtt','ass','diff','patch','bib']);

function kindForExt(ext){
  ext=(ext||'').toLowerCase();
  if (ext==='md'||ext==='markdown'||ext==='mdx') return 'MD';
  if (ext==='csv'||ext==='tsv') return 'CSV';
  if (ext==='json'||ext==='jsonl'||ext==='ndjson'||ext==='geojson') return 'JSON';
  if (ext==='xml'||ext==='svg') return 'XML';
  if (ext==='htm'||ext==='html') return 'HTML';
  if (['yaml','yml','toml','ini','cfg','conf','config','properties','env'].indexOf(ext)!==-1) return 'CONFIG';
  if (['txt','text','log','rst','adoc','asciidoc','tex','bib','srt','vtt','ass','diff','patch'].indexOf(ext)!==-1) return 'TXT';
  if (ext) return 'CODE';
  return 'TXT';
}

async function extractFile(file){
  const name = file.name || 'fichier';
  const lower = name.toLowerCase();
  const ext = lower.indexOf('.') !== -1 ? lower.split('.').pop() : '';
  const head = new Uint8Array(await file.slice(0, 16384).arrayBuffer());

  if (magic(head,[0x25,0x50,0x44,0x46]) || ext==='pdf')
    return { kind:'PDF', text: await readPdf(await file.arrayBuffer()) };

  if (magic(head,[0x50,0x4B,0x03,0x04]) || magic(head,[0x50,0x4B,0x05,0x06]) ||
      ['docx','docm','dotx','pptx','pptm','ppsx','xlsx','xlsm','xltx','zip'].indexOf(ext)!==-1){
    try{ return await readZipDocument(await file.arrayBuffer()); }
    catch(e){ return { kind:'ZIP', text:'[Archive illisible : ' + ((e&&e.message)||e) + ']', binary:true }; }
  }

  if (ext==='rtf' || (head[0]===0x7B && head[1]===0x5C && /rtf\d/.test(new TextDecoder().decode(head.subarray(0,8)))))
    return { kind:'RTF', text: stripRtf(await readTextSmart(file)) };

  if (ext==='htm' || ext==='html')
    return { kind:'HTML', text: htmlToText(await readTextSmart(file)) };

  if (TEXT_EXT.has(ext))
    return { kind: kindForExt(ext), text: await readTextSmart(file) };

  if (looksLikeText(head))
    return { kind:'TEXTE', text: await readTextSmart(file) };

  return { kind:'BIN', text:'[Fichier non textuel — ' + (file.type || 'type inconnu') + ', ' + humanSize(file.size) + '. Le contenu binaire ne peut pas être lu en texte.]', binary:true };
}