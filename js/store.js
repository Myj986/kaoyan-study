'use strict';

/* ================= 全局工具函数 ================= */
function fmtDate(d){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
function parseDate(s){const a=String(s).split('-').map(Number);return new Date(a[0],(a[1]||1)-1,a[2]||1);}
function daysBetween(a,b){return Math.round((parseDate(b)-parseDate(a))/86400000);}
function fmtMin(min){min=Math.round(min);if(min<1)return '0分钟';if(min<60)return min+'分钟';const h=Math.floor(min/60),m=min%60;return h+'小时'+(m?m+'分':'');}
function fmtH(min){min=Math.round(min);if(min<60)return min+'m';return (min/60).toFixed(1).replace(/\.0$/,'')+'h';}
function toMin(hm){const a=String(hm).split(':');return (+a[0])*60+(+a[1]||0);}
function fmtMS(ms){const ts=Math.ceil(ms/1000),p=n=>String(n).padStart(2,'0');const h=Math.floor(ts/3600),m=Math.floor(ts%3600/60),s=ts%60;return h>0?h+':'+p(m)+':'+p(s):m+':'+p(s);}
function cnDate(ds){const d=parseDate(ds);return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日 周'+'日一二三四五六'[d.getDay()];}
function fmtTs(ts){if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());}
function lastNDays(n){const out=[],t=new Date();for(let i=n-1;i>=0;i--){const d=new Date(t.getFullYear(),t.getMonth(),t.getDate()-i);out.push(fmtDate(d));}return out;}
function daysRange(a,b){const out=[];for(let d=parseDate(a);fmtDate(d)<=b;d.setDate(d.getDate()+1))out.push(fmtDate(d));return out;}
const SUB_COLORS=['#4f6ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
function subColor(subject){if(!subject)return SUB_COLORS[0];const i=Store.data.subjects.indexOf(subject);
  const k=i>=0?i:(String(subject).length*7+(String(subject).charCodeAt(0)||0)%7);return SUB_COLORS[k%SUB_COLORS.length];}
function subChipStyle(subject){const c=subColor(subject);return 'background:'+c+'1f;color:'+c+';font-weight:600;';}
function minOn(ds){return Store.data.sessions.reduce((a,s)=>a+(s.date===ds?s.minutes:0),0);}
function subjectTotals(days){const set=new Set(days);const map={};
  Store.data.sessions.forEach(s=>{if(set.has(s.date))map[s.subject]=(map[s.subject]||0)+s.minutes;});
  return Object.keys(map).map(k=>({label:k,value:map[k],color:subColor(k)})).filter(s=>s.value>0).sort((a,b)=>b.value-a.value);}
function streakDays(){let s=0;const d=new Date();if(minOn(fmtDate(d))===0)d.setDate(d.getDate()-1);
  while(minOn(fmtDate(d))>0){s++;d.setDate(d.getDate()-1);}return s;}

/* ================= 数据层（localStorage） ================= */
const Store={
  KEY:'kaoyan_study_v1',
  data:null,

  defaults(){return{
    version:1,
    settings:{name:'',examDate:'2026-12-19',dailyGoalMin:480,pomo:{focus:25,shortBreak:5,longBreak:15,longEvery:4}},
    subjects:['数学','英语','政治','专业课'],
    sessions:[],   // {id,date,subject,minutes,start,end,note,src:'manual'|'pomo',createdAt}
    materials:[],  // {id,title,subject,type,link,note,progress,createdAt}
    mistakes:[],   // {id,subject,question,myAnswer,answer,analysis,source,mastery,reviews,lastReview,createdAt}
    todos:[]       // {id,text,subject,due,done,createdAt}
  };},

  normalize(d){
    d=(d&&typeof d==='object')?d:{};
    const def=this.defaults();
    const out=Object.assign({},def,d);
    out.settings=Object.assign({},def.settings,d.settings||{});
    out.settings.pomo=Object.assign({},def.settings.pomo,(d.settings||{}).pomo||{});
    out.subjects=Array.isArray(d.subjects)&&d.subjects.length?d.subjects.slice():def.subjects.slice();
    ['sessions','materials','mistakes','todos'].forEach(k=>{if(!Array.isArray(d[k]))out[k]=[];});
    return out;
  },

  load(){
    let raw=null,parsed=null;
    try{raw=localStorage.getItem(this.KEY);}catch(e){}
    try{parsed=raw?JSON.parse(raw):null;}catch(e){parsed=null;}
    this.data=this.normalize(parsed);
    this.save();
  },
  save(){try{localStorage.setItem(this.KEY,JSON.stringify(this.data));}catch(e){}},
  uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);},
  today(){return fmtDate(new Date());},
  addSession(o){
    this.data.sessions.push(Object.assign({id:this.uid(),createdAt:Date.now(),src:'manual',start:'',end:'',note:''},o));
    this.save();
  }
};
