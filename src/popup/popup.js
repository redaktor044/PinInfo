const RESEARCH_KEY='pininfo:research';const FAVORITES_KEY='pininfo:favorites';
async function getState(){const d=await chrome.storage.local.get([RESEARCH_KEY,FAVORITES_KEY]);return{research:Array.isArray(d[RESEARCH_KEY])?d[RESEARCH_KEY]:[],favorites:Array.isArray(d[FAVORITES_KEY])?d[FAVORITES_KEY]:[]}}
function esc(v){if(v==null)return '';const t=String(v).replace(/\r?\n|\r/g,' ');return /[",]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}
function uniquePins(s){const map=new Map();[...s.research,...s.favorites].forEach(p=>{if(p?.url)map.set(p.url,p)});return[...map.values()]}
function csv(pins){const c=['pin_id','pin_url','image_url','title','creator','creator_url','board','board_url','description','source_url','saves','impressions','pin_clicks','outbound_clicks','comments','published_at','observed_at','observed_from_url','keywords','trend_score','metrics_source'];return['\ufeff'+c.join(','),...pins.map(p=>c.map(k=>esc(p[k])).join(','))].join('\n')}
function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function refresh(){const s=await getState();document.querySelector('#researchCount').textContent=s.research.length;document.querySelector('#favoriteCount').textContent=s.favorites.length;const urls=new Set(uniquePins(s).map(p=>p.observed_from_url||p.page_url).filter(Boolean));document.querySelector('#pageCount').textContent=urls.size||uniquePins(s).length}
document.querySelector('#exportCsv').addEventListener('click',async()=>{const s=await getState();download(`pininfo-research-${new Date().toISOString().slice(0,10)}.csv`,csv(uniquePins(s)),'text/csv;charset=utf-8')});
document.querySelector('#exportJson').addEventListener('click',async()=>{const s=await getState();download(`pininfo-research-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(s,null,2),'application/json')});
document.querySelector('#clearResearch').addEventListener('click',async()=>{await chrome.storage.local.set({[RESEARCH_KEY]:[]});refresh()});
document.querySelector('#clearFavorites').addEventListener('click',async()=>{await chrome.storage.local.set({[FAVORITES_KEY]:[]});refresh()});
document.querySelector('#diagnostic').addEventListener('click',async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)return;chrome.tabs.sendMessage(tab.id,{type:'PININFO_RUN_DIAGNOSTIC'},()=>{});window.close()});
refresh();
