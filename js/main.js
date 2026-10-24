'use strict';

/* ================= 基础 UI 工具 ================= */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function $(sel,root){return (root||document).querySelector(sel);}
function $$(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}

function toast(msg){
  const r=$('#toast-root');
  const t=document.createElement('div');
  t.className='toast';
  t.textContent=msg;
  r.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),350);},2200);
}

const Modal={
  open(html,opts){
    opts=opts||{};
    const root=$('#modal-root');
    root.innerHTML='<div class="modal-overlay"><div class="modal">'+html+'</div></div>';
    const ov=$('.modal-overlay',root);
    ov.addEventListener('mousedown',e=>{if(e.target===ov)Modal.close();});
    $$('[data-close]',root).forEach(b=>b.onclick=()=>Modal.close());
    document.body.style.overflow='hidden';
    if(opts.onMount)opts.onMount(root);
  },
  close(){
    $('#modal-root').innerHTML='';
    document.body.style.overflow='';
  },
  confirm(title,text,onOk,okText){
    this.open(
      '<h3>'+esc(title)+'</h3><p class="muted" style="margin-top:8px">'+esc(text)+'</p>'+
      '<div class="modal-actions"><button class="btn" data-close>取消</button>'+
      '<button class="btn danger solid" id="mc-ok">'+esc(okText||'删除')+'</button></div>',
      {onMount(){$('#mc-ok').onclick=()=>{Modal.close();onOk();};}}
    );
  }
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')Modal.close();});

/* ================= 常量 ================= */
const MAT_TYPES=['教材','视频课程','真题','笔记','文章/链接','其他'];
const MASTERY_LABEL={again:'待复习',vague:'有点模糊',mastered:'已掌握'};
const WEEKDAY='日一二三四五六';

function subjectOptions(selected,allLabel){
  return '<option value="">'+(allLabel||'全部科目')+'</option>'+
    Store.data.subjects.map(s=>'<option value="'+esc(s)+'"'+(s===selected?' selected':'')+'>'+esc(s)+'</option>').join('');
}
function matStatus(m){return m.progress>=100?'已完成':(m.progress>0?'进行中':'未开始');}
function bindTodoToggle(){
  $$('input[data-td]').forEach(c=>c.onchange=()=>{
    const t=Store.data.todos.find(x=>x.id===c.dataset.td);
    if(!t)return;
    t.done=c.checked;
    Store.save();
    if(t.done)toast('完成一项，很棒！✅');
    App.render();
  });
}
function donutLegend(canvasId,legendId,segs,centerText,centerSub){
  const cv=$(canvasId);
  if(cv)Charts.donut(cv,segs,{centerText:centerText,centerSub:centerSub});
  const lg=$(legendId);
  const total=segs.reduce((a,s)=>a+s.value,0);
  if(lg)lg.innerHTML=segs.length?segs.map(s=>
    '<div class="lg-row"><span class="dot" style="background:'+s.color+'"></span>'+
    '<span class="lg-name">'+esc(s.label)+'</span><span class="lg-val">'+fmtH(s.value)+'</span>'+
    '<span class="lg-pct">'+(total?Math.round(100*s.value/total):0)+'%</span></div>').join('')
    :'<div class="empty">暂无数据</div>';
}

/* ================= 各视图 ================= */
const Views={

  /* ---------- 概览 ---------- */
  dashboard:{
    render(){
      const d=Store.data,st=d.settings,today=Store.today();
      const todays=d.sessions.filter(s=>s.date===today);
      const tMin=todays.reduce((a,b)=>a+b.minutes,0);
      const goal=st.dailyGoalMin||480;
      const pomos=todays.filter(s=>s.src==='pomo');
      const pomoMin=pomos.reduce((a,b)=>a+b.minutes,0);
      const dl=Math.max(0,daysBetween(today,st.examDate));
      const week7=lastNDays(7).map(dt=>({dt,v:minOn(dt)}));
      const wTotal=week7.reduce((a,b)=>a+b.v,0);
      const dueToday=d.todos.filter(t=>!t.done&&t.due&&t.due<=today).slice(0,5);
      const recentM=d.mistakes.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,3);
      const hour=new Date().getHours();
      const greet=hour<6?'夜深了':hour<12?'上午好':hour<14?'中午好':hour<18?'下午好':'晚上好';
      const name=st.name?'，'+st.name:'';
      return ''+
      '<div class="page-head"><h2>'+greet+esc(name)+'，继续加油 💪</h2><div class="muted">'+cnDate(today)+'</div></div>'+
      '<div class="grid-4">'+
        '<div class="card countdown"><div class="cd-label">距考研初试</div>'+
          '<div class="cd-num">'+dl+'</div><div class="cd-sub">天'+(daysBetween(today,st.examDate)<0?'（已开考，全力以赴！）':'')+'</div>'+
          '<div class="cd-date">'+esc(st.examDate)+'</div></div>'+
        '<div class="card stat-card"><div class="stat-label">今日学习</div>'+
          '<canvas id="dash-ring" class="ring-canvas"></canvas>'+
          '<div class="stat-sub" style="text-align:center">'+fmtMin(tMin)+' / 目标 '+fmtMin(goal)+'</div></div>'+
        '<div class="card stat-card"><div class="stat-label">今日专注</div>'+
          '<div class="stat-num">🍅 × '+pomos.length+'</div>'+
          '<div class="stat-sub">'+fmtMin(pomoMin)+'</div></div>'+
        '<div class="card stat-card"><div class="stat-label">本周学习</div>'+
          '<div class="stat-num">'+fmtH(wTotal)+'</div>'+
          '<div class="stat-sub">🔥 连续学习 '+streakDays()+' 天</div></div>'+
      '</div>'+
      '<div class="grid-2">'+
        '<div class="card"><div class="card-title">近 7 天学习时长</div><canvas id="dash-bar" class="chart-canvas"></canvas></div>'+
        '<div class="card"><div class="card-title">近 30 天科目分布</div>'+
          '<div class="donut-wrap"><canvas id="dash-donut" class="donut-canvas"></canvas><div class="legend" id="dash-legend"></div></div></div>'+
      '</div>'+
      '<div class="grid-2">'+
        '<div class="card"><div class="card-title">今日待办 <a class="link" data-go="todos">全部 →</a></div>'+
          (dueToday.length?dueToday.map(t=>
            '<label class="todo-row slim"><input type="checkbox" data-td="'+t.id+'"'+(t.done?' checked':'')+'>'+
            '<span class="t-text">'+esc(t.text)+'</span>'+
            '<span class="t-due'+(t.due<today?' overdue':'')+'">'+(t.due<today?'逾期 ':'')+esc(t.due)+'</span></label>').join('')
          :'<div class="empty">今天没有待办，去<a class="link" data-go="todos">计划页</a>安排一下吧 ☀️</div>')+'</div>'+
        '<div class="card"><div class="card-title">最近错题 <a class="link" data-go="mistakes">错题本 →</a></div>'+
          (recentM.length?recentM.map(m=>
            '<div class="recent-mis"><span class="chip" style="'+subChipStyle(m.subject)+'">'+esc(m.subject)+'</span>'+
            '<span class="rm-q" title="'+esc(m.question)+'">'+esc(m.question)+'</span></div>').join('')
          :'<div class="empty">还没有错题记录</div>')+'</div>'+
      '</div>';
    },
    mount(){
      const today=Store.today(),goal=Store.data.settings.dailyGoalMin||480;
      const tMin=minOn(today);
      Charts.ring($('#dash-ring'),goal>0?tMin/goal:0,{centerText:Math.round(Math.min(1,goal>0?tMin/goal:0)*100)+'%'});
      const week7=lastNDays(7);
      Charts.bar($('#dash-bar'),week7.map((dt,i)=>({
        label:i===6?'今天':'周'+WEEKDAY[parseDate(dt).getDay()],
        value:minOn(dt),
        color:i===6?'#4f6ef7':'#a9bdfb'
      })));
      const sub30=subjectTotals(lastNDays(30));
      donutLegend('#dash-donut','#dash-legend',sub30,fmtH(sub30.reduce((a,s)=>a+s.value,0)),'近30天');
      bindTodoToggle();
    }
  },

  /* ---------- 番茄钟 ---------- */
  focus:{
    render(){
      const T=Timer,subs=Store.data.subjects,p=Store.data.settings.pomo;
      const pomosToday=Store.data.sessions.filter(s=>s.date===Store.today()&&s.src==='pomo');
      return ''+
      '<div class="page-head"><h2>专注 · 番茄钟</h2><div class="muted">专注一个番茄，胜过忙碌一下午</div></div>'+
      '<div class="focus-layout">'+
        '<div class="card focus-card">'+
          '<div class="mode-pills">'+
            '<button data-pm="focus" class="'+(T.mode==='focus'?'active':'')+'">专注</button>'+
            '<button data-pm="short" class="'+(T.mode==='short'?'active':'')+'">短休息</button>'+
            '<button data-pm="long" class="'+(T.mode==='long'?'active':'')+'">长休息</button>'+
          '</div>'+
          '<div class="ring-wrap">'+
            '<svg width="250" height="250" viewBox="0 0 250 250">'+
              '<circle class="ring-bg" cx="125" cy="125" r="110"></circle>'+
              '<circle id="pomo-ring" class="ring-fg'+(T.mode!=='focus'?' break':'')+'" cx="125" cy="125" r="110"></circle>'+
            '</svg>'+
            '<div class="ring-center"><div id="pomo-time" class="pomo-time">--:--</div><div id="pomo-status" class="pomo-status"></div></div>'+
          '</div>'+
          '<div class="pomo-subject">科目：<select id="pomo-subject" class="input"'+(T.running?' disabled':'')+'>'+
            subs.map(s=>'<option'+(s===T.subject?' selected':'')+'>'+esc(s)+'</option>').join('')+'</select></div>'+
          '<div class="pomo-controls">'+
            '<button id="pomo-start" class="btn primary big"></button>'+
            '<button id="pomo-reset" class="btn">重置</button>'+
            (T.mode==='focus'?'<button id="pomo-finish" class="btn">结束并记录</button>':'<button id="pomo-skip" class="btn">跳过休息</button>')+
          '</div>'+
          '<div class="cycles-dots" id="cycles-dots"></div>'+
          '<div class="muted small" style="margin-top:10px">完成 '+p.longEvery+' 个番茄后，来一次长休息 🌿</div>'+
        '</div>'+
        '<div class="focus-side">'+
          '<div class="card"><div class="card-title">今日专注</div><div class="focus-stats">'+
            '<div><div class="stat-num">'+pomosToday.length+' 个</div><div class="stat-sub">番茄数</div></div>'+
            '<div><div class="stat-num">'+fmtMin(pomosToday.reduce((a,b)=>a+b.minutes,0))+'</div><div class="stat-sub">专注时长</div></div>'+
          '</div></div>'+
          '<div class="card"><div class="card-title">近 7 天专注时长</div><canvas id="focus-bar" class="chart-canvas" style="height:180px"></canvas></div>'+
          '<div class="card"><div class="card-title">怎么用？</div><div class="muted small" style="line-height:2">'+
            '1️⃣ 选好科目，点击「开始专注」，这 25 分钟只做这一件事；<br>'+
            '2️⃣ 铃声响后休息 5 分钟，离开桌前走一走；<br>'+
            '3️⃣ 每 '+p.longEvery+' 个番茄后长休息 15 分钟；<br>'+
            '4️⃣ 被打断或想提前结束？点「结束并记录」，已专注的时长照样计入 ✅'+
          '</div></div>'+
        '</div>'+
      '</div>';
    },
    mount(){
      const T=Timer,p=Store.data.settings.pomo;
      const done=T.cycles===0?0:((T.cycles-1)%p.longEvery)+1;
      $('#cycles-dots').innerHTML=Array.from({length:p.longEvery},(_,i)=>'<span class="'+(i<done?'on':'')+'"></span>').join('');
      $('#pomo-start').onclick=()=>{T.running?T.pause():T.start();App.onTimerStateChange();};
      $('#pomo-reset').onclick=()=>{T.reset();App.onTimerStateChange();};
      const pf=$('#pomo-finish');
      if(pf)pf.onclick=()=>T.finishEarly();
      const ps=$('#pomo-skip');
      if(ps)ps.onclick=()=>{T.skip();App.onTimerStateChange();};
      $('#pomo-subject').onchange=e=>{T.subject=e.target.value;T.persist();T.updateUI();};
      $$('.mode-pills button').forEach(b=>b.onclick=()=>{
        if(T.running){toast('请先暂停或完成当前阶段');return;}
        T.setMode(b.dataset.pm);
        App.render();
      });
      const wk=lastNDays(7).map((dt,i)=>({
        label:i===6?'今天':'周'+WEEKDAY[parseDate(dt).getDay()],
        value:Store.data.sessions.filter(s=>s.date===dt&&s.src==='pomo').reduce((a,b)=>a+b.minutes,0)
      }));
      Charts.bar($('#focus-bar'),wk,{color:'#22c55e'});
      T.updateUI();
    }
  },

  /* ---------- 时间记录 ---------- */
  log:{
    render(){
      const f=App.f.log,d=Store.data,today=Store.today();
      let list=d.sessions.slice().sort((a,b)=>a.date<b.date?1:(a.date>b.date?-1:b.createdAt-a.createdAt));
      if(f.subject)list=list.filter(s=>s.subject===f.subject);
      if(f.date)list=list.filter(s=>s.date===f.date);
      const wMin=lastNDays(7).reduce((a,dt)=>a+minOn(dt),0);
      const groups=[];
      let cur=null;
      list.forEach(s=>{
        if(!cur||cur.date!==s.date){cur={date:s.date,items:[],min:0};groups.push(cur);}
        cur.items.push(s);cur.min+=s.minutes;
      });
      return ''+
      '<div class="page-head"><h2>时间记录</h2><button class="btn primary" id="add-session">＋ 添加记录</button></div>'+
      '<div class="sum-chips">'+
        '<span class="chip" style="background:'+subChipStyle('今日').split(';')[0]+';color:#4f6ef7">今日 '+fmtMin(minOn(today))+'</span>'+
        '<span class="chip">本周 '+fmtH(wMin)+'</span>'+
        '<span class="chip">共 '+d.sessions.length+' 条</span></div>'+
      '<div class="filters">'+
        '<select id="f-subject" class="input">'+subjectOptions(f.subject)+'</select>'+
        '<input type="date" id="f-date" class="input" value="'+esc(f.date)+'">'+
        '<button class="btn sm" id="f-clear">重置</button></div>'+
      (groups.length?groups.map(g=>
        '<div class="day-head"><span>'+cnDate(g.date)+'</span><span>合计 '+fmtMin(g.min)+'</span></div>'+
        g.items.map(s=>
          '<div class="log-row">'+
            '<span class="chip" style="'+subChipStyle(s.subject)+'">'+esc(s.subject)+'</span>'+
            (s.src==='pomo'?'<span class="chip pomo">🍅 番茄</span>':'')+
            (s.start?'<span class="muted small">'+esc(s.start)+' – '+esc(s.end)+'</span>':'')+
            (s.note?'<span class="note">'+esc(s.note)+'</span>':'')+
            '<span class="dur">'+fmtMin(s.minutes)+'</span>'+
            '<button class="icon-btn" data-edit-sess="'+s.id+'" title="编辑">✏️</button>'+
            '<button class="icon-btn" data-del-sess="'+s.id+'" title="删除">🗑</button>'+
          '</div>').join('')).join('')
      :'<div class="card"><div class="empty">还没有学习记录<br>点击右上角「＋ 添加记录」，或用番茄钟自动记录 ⏱</div></div>');
    },
    mount(){
      const f=App.f.log;
      $('#add-session').onclick=()=>openSessionModal();
      $('#f-subject').onchange=e=>{f.subject=e.target.value;App.render();};
      $('#f-date').onchange=e=>{f.date=e.target.value;App.render();};
      $('#f-clear').onclick=()=>{App.f.log={subject:'',date:''};App.render();};
      $$('[data-del-sess]').forEach(b=>b.onclick=()=>{
        Modal.confirm('删除这条学习记录？','删除后无法恢复。',()=>{
          Store.data.sessions=Store.data.sessions.filter(x=>x.id!==b.dataset.delSess);
          Store.save();App.render();toast('已删除');
        });
      });
      $$('[data-edit-sess]').forEach(b=>b.onclick=()=>openSessionModal(b.dataset.editSess));
    }
  },

  /* ---------- 学习资料 ---------- */
  materials:{
    render(){
      const f=App.f.mat;
      let list=Store.data.materials.slice().sort((a,b)=>b.createdAt-a.createdAt);
      if(f.subject)list=list.filter(m=>m.subject===f.subject);
      if(f.status)list=list.filter(m=>matStatus(m)===f.status);
      const stCls={'未开始':'todo','进行中':'doing','已完成':'done'};
      return ''+
      '<div class="page-head"><h2>学习资料</h2><button class="btn primary" id="add-mat">＋ 添加资料</button></div>'+
      '<div class="filters">'+
        '<select id="mf-subject" class="input">'+subjectOptions(f.subject)+'</select>'+
        '<select id="mf-status" class="input">'+
          '<option value="">全部状态</option>'+
          ['未开始','进行中','已完成'].map(s=>'<option'+(f.status===s?' selected':'')+'>'+s+'</option>').join('')+
        '</select>'+
        '<span class="muted small">共 '+list.length+' 项</span></div>'+
      (list.length?'<div class="mat-grid">'+list.map(m=>{
        const st=matStatus(m);
        return '<div class="card mat-card">'+
          '<div class="mat-top"><b class="mat-title">'+esc(m.title)+'</b><span class="chip '+stCls[st]+'">'+st+'</span></div>'+
          '<div class="mat-meta"><span class="chip" style="'+subChipStyle(m.subject)+'">'+esc(m.subject)+'</span>'+
            '<span class="chip">'+esc(m.type||'其他')+'</span></div>'+
          '<div class="progress-line"><input type="range" class="mat-range" data-id="'+m.id+'" min="0" max="100" step="5" value="'+(+m.progress||0)+'">'+
            '<span class="pv">'+(+m.progress||0)+'%</span></div>'+
          (m.note?'<div class="mat-note">'+esc(m.note)+'</div>':'')+
          '<div class="mat-foot">'+
            (m.link?'<a class="link" href="'+esc(m.link)+'" target="_blank" rel="noopener">🔗 打开链接</a>':'<span></span>')+
            '<span class="mis-actions">'+
              '<button class="icon-btn" data-edit-mat="'+m.id+'" title="编辑">✏️</button>'+
              '<button class="icon-btn" data-del-mat="'+m.id+'" title="删除">🗑</button></span>'+
          '</div></div>';
      }).join('')+'</div>'
      :'<div class="card"><div class="empty">还没有资料<br>点击右上角「＋ 添加资料」，把你的书单和网课都收纳进来 📚</div></div>');
    },
    mount(){
      const f=App.f.mat;
      $('#add-mat').onclick=()=>openMaterialModal();
      $('#mf-subject').onchange=e=>{f.subject=e.target.value;App.render();};
      $('#mf-status').onchange=e=>{f.status=e.target.value;App.render();};
      $$('.mat-range').forEach(r=>{
        r.oninput=()=>{r.nextElementSibling.textContent=r.value+'%';};
        r.onchange=()=>{
          const m=Store.data.materials.find(x=>x.id===r.dataset.id);
          if(!m)return;
          m.progress=+r.value;
          Store.save();
          if(m.progress>=100)toast('🎉 完成一份资料，干得漂亮！');
          App.render();
        };
      });
      $$('[data-edit-mat]').forEach(b=>b.onclick=()=>openMaterialModal(b.dataset.editMat));
      $$('[data-del-mat]').forEach(b=>b.onclick=()=>{
        Modal.confirm('删除这份资料？','删除后无法恢复。',()=>{
          Store.data.materials=Store.data.materials.filter(x=>x.id!==b.dataset.delMat);
          Store.save();App.render();toast('已删除');
        });
      });
    }
  },

  /* ---------- 错题本 ---------- */
  mistakes:{
    render(){
      const f=App.f.mis;
      let list=Store.data.mistakes.slice().sort((a,b)=>b.createdAt-a.createdAt);
      if(f.subject)list=list.filter(m=>m.subject===f.subject);
      if(f.mastery)list=list.filter(m=>m.mastery===f.mastery);
      return ''+
      '<div class="page-head"><h2>错题本</h2>'+
        '<span><button class="btn" id="review-mis" style="margin-right:8px">🎲 随机复习</button>'+
        '<button class="btn primary" id="add-mis">＋ 记错题</button></span></div>'+
      '<div class="filters">'+
        '<select id="mf-subject2" class="input">'+subjectOptions(f.subject)+'</select>'+
        '<select id="mf-mastery" class="input">'+
          '<option value="">全部状态</option>'+
          Object.keys(MASTERY_LABEL).map(k=>'<option value="'+k+'"'+(f.mastery===k?' selected':'')+'>'+MASTERY_LABEL[k]+'</option>').join('')+
        '</select>'+
        '<span class="muted small">共 '+list.length+' 题</span></div>'+
      (list.length?list.map(m=>
        '<div class="card mis-card m-'+esc(m.mastery)+'">'+
          '<div class="mis-meta">'+
            '<span class="chip" style="'+subChipStyle(m.subject)+'">'+esc(m.subject)+'</span>'+
            '<span class="chip '+esc(m.mastery)+'">'+MASTERY_LABEL[m.mastery]+'</span>'+
            (m.source?'<span class="muted small">📌 '+esc(m.source)+'</span>':'')+
            '<span class="muted small">复习 '+(m.reviews||0)+' 次</span>'+
            '<span class="mis-actions">'+
              (m.mastery!=='mastered'?'<button class="btn sm" data-master="'+m.id+'">✓ 已掌握</button>':'')+
              '<button class="icon-btn" data-edit-mis="'+m.id+'" title="编辑">✏️</button>'+
              '<button class="icon-btn" data-del-mis="'+m.id+'" title="删除">🗑</button></span>'+
          '</div>'+
          '<div class="mis-q" data-view-mis="'+m.id+'">'+esc(m.question)+'</div>'+
        '</div>').join('')
      :'<div class="card"><div class="empty">错题本还是空的<br>做错的题记下来，考前它就是你的提分秘籍 📕</div></div>');
    },
    mount(){
      const f=App.f.mis;
      $('#add-mis').onclick=()=>openMistakeModal();
      $('#review-mis').onclick=startReview;
      $('#mf-subject2').onchange=e=>{f.subject=e.target.value;App.render();};
      $('#mf-mastery').onchange=e=>{f.mastery=e.target.value;App.render();};
      $$('[data-master]').forEach(b=>b.onclick=()=>{
        const m=Store.data.mistakes.find(x=>x.id===b.dataset.master);
        if(!m)return;
        m.mastery='mastered';m.reviews=(m.reviews||0)+1;m.lastReview=Store.today();
        Store.save();App.render();toast('太棒了，又消灭一道错题！💪');
      });
      $$('[data-edit-mis]').forEach(b=>b.onclick=()=>openMistakeModal(b.dataset.editMis));
      $$('[data-del-mis]').forEach(b=>b.onclick=()=>{
        Modal.confirm('删除这道错题？','删除后无法恢复。',()=>{
          Store.data.mistakes=Store.data.mistakes.filter(x=>x.id!==b.dataset.delMis);
          Store.save();App.render();toast('已删除');
        });
      });
      $$('[data-view-mis]').forEach(q=>q.onclick=()=>openMistakeDetail(q.dataset.viewMis));
    }
  },

  /* ---------- 学习计划 ---------- */
  todos:{
    render(){
      const d=Store.data,today=Store.today();
      const undone=d.todos.filter(t=>!t.done).sort((a,b)=>a.due<b.due?-1:(a.due>b.due?1:b.createdAt-a.createdAt));
      const done=d.todos.filter(t=>t.done).sort((a,b)=>b.createdAt-a.createdAt).slice(0,30);
      return ''+
      '<div class="page-head"><h2>学习计划</h2><div class="muted">未完成 '+undone.length+' 项</div></div>'+
      '<div class="card" style="margin-bottom:18px"><div class="todo-add">'+
        '<input id="todo-text" class="input" placeholder="今天要完成什么？例如：英语阅读真题 2 篇">'+
        '<input id="todo-subject" class="input" list="subject-list" placeholder="科目（可选）" style="max-width:140px;flex:1">'+
        '<input type="date" id="todo-due" class="input" value="'+today+'" style="max-width:165px;flex:1">'+
        '<button class="btn primary" id="todo-add">＋ 添加</button></div></div>'+
      '<div class="card" style="margin-bottom:18px"><div class="card-title">待完成</div>'+
        (undone.length?undone.map(t=>todoRowHTML(t,today)).join(''):'<div class="empty">太棒了，所有计划都完成啦 🎉</div>')+'</div>'+
      '<div class="card"><div class="card-title">已完成（最近）</div>'+
        (done.length?done.map(t=>todoRowHTML(t,today)).join(''):'<div class="empty">还没有完成的记录</div>')+'</div>';
    },
    mount(){
      const today=Store.today();
      const add=()=>{
        const text=$('#todo-text').value.trim();
        if(!text)return toast('先写点什么吧');
        const subject=$('#todo-subject').value.trim();
        if(subject&&!Store.data.subjects.includes(subject))Store.data.subjects.push(subject);
        Store.data.todos.push({id:Store.uid(),text:text,subject:subject,due:$('#todo-due').value||today,done:false,createdAt:Date.now()});
        Store.save();App.render();
        $('#todo-text').focus();
      };
      $('#todo-add').onclick=add;
      $('#todo-text').onkeydown=e=>{if(e.key==='Enter')add();};
      bindTodoToggle();
      $$('[data-del-todo]').forEach(b=>b.onclick=()=>{
        Store.data.todos=Store.data.todos.filter(x=>x.id!==b.dataset.delTodo);
        Store.save();App.render();
      });
    }
  },

  /* ---------- 统计 ---------- */
  stats:{
    render(){
      const r=App.f.stats.range;
      const days=r===0?allDays():lastNDays(r);
      const totalMin=days.reduce((a,dt)=>a+minOn(dt),0);
      const activeDays=days.filter(dt=>minOn(dt)>0).length;
      const avg=activeDays?Math.round(totalMin/activeDays):0;
      const daySet=new Set(days);
      const pomoN=Store.data.sessions.filter(s=>s.src==='pomo'&&daySet.has(s.date)).length;
      const mis=Store.data.mistakes;
      const mastered=mis.filter(m=>m.mastery==='mastered').length;
      const chartDays=days.length>120?days.slice(-120):days;
      return ''+
      '<div class="page-head"><h2>学习统计</h2>'+
        '<div class="mode-pills">'+[[7,'近7天'],[30,'近30天'],[90,'近90天'],[0,'全部']].map(it=>
          '<button data-range="'+it[0]+'" class="'+(r===it[0]?'active':'')+'">'+it[1]+'</button>').join('')+'</div></div>'+
      '<div class="grid-4">'+
        '<div class="card stat-card"><div class="stat-label">总学习时长</div><div class="stat-num">'+fmtH(totalMin)+'</div><div class="stat-sub">统计范围 '+days.length+' 天</div></div>'+
        '<div class="card stat-card"><div class="stat-label">日均（有记录天）</div><div class="stat-num">'+fmtMin(avg)+'</div><div class="stat-sub">其中 '+activeDays+' 天有学习</div></div>'+
        '<div class="card stat-card"><div class="stat-label">专注番茄</div><div class="stat-num">🍅 × '+pomoN+'</div><div class="stat-sub">🔥 连续学习 '+streakDays()+' 天</div></div>'+
        '<div class="card stat-card"><div class="stat-label">错题掌握</div><div class="stat-num">'+mastered+'/'+mis.length+'</div><div class="stat-sub">掌握率 '+(mis.length?Math.round(100*mastered/mis.length):0)+'%</div></div>'+
      '</div>'+
      '<div class="card" style="margin-bottom:20px"><div class="card-title">每日学习时长'+(days.length>120?'（最近 120 天）':'')+'</div>'+
        '<canvas id="stats-bar" class="chart-canvas"></canvas></div>'+
      '<div class="grid-2">'+
        '<div class="card"><div class="card-title">科目分布</div>'+
          '<div class="donut-wrap"><canvas id="stats-donut" class="donut-canvas"></canvas><div class="legend" id="stats-legend"></div></div></div>'+
        '<div class="card"><div class="card-title">坚持热力图（近 15 周）</div>'+heatmapHTML()+'</div>'+
      '</div>';
    },
    mount(){
      const r=App.f.stats.range;
      const days=r===0?allDays():lastNDays(r);
      const chartDays=days.length>120?days.slice(-120):days;
      Charts.bar($('#stats-bar'),chartDays.map(dt=>({label:(+dt.slice(5,7))+'/'+(+dt.slice(8,10)),value:minOn(dt)})));
      const segs=subjectTotals(days);
      donutLegend('#stats-donut','#stats-legend',segs,fmtH(segs.reduce((a,s)=>a+s.value,0)),'合计');
      $$('[data-range]').forEach(b=>b.onclick=()=>{App.f.stats.range=+b.dataset.range;App.render();});
    }
  },

  /* ---------- 设置 ---------- */
  settings:{
    render(){
      const st=Store.data.settings,p=st.pomo;
      return ''+
      '<div class="page-head"><h2>设置</h2></div>'+
      '<div class="grid-2">'+
        '<div class="card"><div class="card-title">👤 个人与目标</div>'+
          '<label class="f-label">昵称（可选）</label><input id="set-name" class="input" value="'+esc(st.name)+'" placeholder="怎么称呼你？">'+
          '<label class="f-label">考研初试日期</label><input type="date" id="set-exam" class="input" value="'+esc(st.examDate)+'">'+
          '<label class="f-label">每日学习目标（小时）</label><input type="number" id="set-goal" class="input" min="0.5" max="16" step="0.5" value="'+(st.dailyGoalMin/60).toFixed(1)+'">'+
        '</div>'+
        '<div class="card"><div class="card-title">🍅 番茄钟</div>'+
          '<div class="f-row">'+
            '<div><label class="f-label">专注时长（分钟）</label><input type="number" id="set-focus" class="input" min="1" max="180" value="'+p.focus+'"></div>'+
            '<div><label class="f-label">短休息（分钟）</label><input type="number" id="set-short" class="input" min="1" max="30" value="'+p.shortBreak+'"></div></div>'+
          '<div class="f-row">'+
            '<div><label class="f-label">长休息（分钟）</label><input type="number" id="set-long" class="input" min="1" max="60" value="'+p.longBreak+'"></div>'+
            '<div><label class="f-label">几个番茄后长休息</label><input type="number" id="set-every" class="input" min="2" max="8" value="'+p.longEvery+'"></div></div>'+
          '<p class="muted small" style="margin-top:10px">修改后点击页面其他位置即可保存。</p>'+
        '</div>'+
      '</div>'+
      '<div class="grid-2">'+
        '<div class="card"><div class="card-title">📚 科目管理</div>'+
          '<div class="sub-chips">'+Store.data.subjects.map((s,i)=>
            '<span class="chip big-chip" style="'+subChipStyle(s)+'">'+esc(s)+
            '<button class="chip-x" data-del-sub="'+i+'" title="删除">×</button></span>').join('')+'</div>'+
          '<div class="f-row" style="margin-top:14px"><input id="new-subject" class="input" placeholder="添加科目，如：408计算机">'+
            '<button class="btn primary" id="add-subject" style="flex:0 0 auto">添加</button></div>'+
        '</div>'+
        '<div class="card"><div class="card-title">💾 数据管理</div>'+
          '<p class="muted small">所有数据仅保存在当前浏览器中。换电脑、换浏览器或清理浏览器数据前，请先导出备份。建议每周备份一次。</p>'+
          '<div class="set-actions">'+
            '<button class="btn" id="btn-export">⬇️ 导出备份</button>'+
            '<button class="btn" id="btn-import">⬆️ 导入备份</button>'+
            '<input type="file" id="file-import" accept=".json,application/json" hidden>'+
            '<button class="btn danger" id="btn-clear">🗑 清空所有数据</button></div>'+
          '<p class="muted small" style="margin-top:16px">考研学习助手 v1.0 · 祝你上岸！🎓</p>'+
        '</div>'+
      '</div>';
    },
    mount(){
      const st=Store.data.settings,p=st.pomo;
      $('#set-name').onchange=e=>{st.name=e.target.value.trim();Store.save();toast('已保存 ✓');App.render();};
      $('#set-exam').onchange=e=>{
        if(!e.target.value)return;
        st.examDate=e.target.value;Store.save();toast('倒计时已更新 🎯');App.render();
      };
      $('#set-goal').onchange=e=>{
        const v=Math.max(0.5,Math.min(16,+e.target.value||8));
        e.target.value=v.toFixed(1);
        st.dailyGoalMin=Math.round(v*60);Store.save();toast('已保存 ✓');App.render();
      };
      const num=(id,min,max,key,integer)=>{ $(id).onchange=e=>{
        let v=+e.target.value||Store.data.settings.pomo[key];
        v=Math.max(min,Math.min(max,v));
        if(integer)v=Math.round(v);
        e.target.value=v;
        Store.data.settings.pomo[key]=v;
        Store.save();toast('已保存 ✓');
      };};
      num('#set-focus',1,180,'focus',false);
      num('#set-short',1,30,'shortBreak',false);
      num('#set-long',1,60,'longBreak',false);
      num('#set-every',2,8,'longEvery',true);
      $('#add-subject').onclick=()=>{
        const v=$('#new-subject').value.trim();
        if(!v)return toast('请输入科目名称');
        if(Store.data.subjects.includes(v))return toast('该科目已存在');
        Store.data.subjects.push(v);
        Store.save();App.render();toast('已添加科目「'+v+'」');
      };
      $$('[data-del-sub]').forEach(b=>b.onclick=()=>{
        const i=+b.dataset.delSub,name=Store.data.subjects[i];
        Modal.confirm('删除科目「'+name+'」？','已有记录会保留该科目名称，只是新建记录时不再提供该选项。',()=>{
          Store.data.subjects.splice(i,1);
          Store.save();App.render();toast('已删除');
        });
      });
      $('#btn-export').onclick=()=>{
        try{
          const blob=new Blob([JSON.stringify(Store.data,null,2)],{type:'application/json'});
          const a=document.createElement('a');
          a.href=URL.createObjectURL(blob);
          a.download='kaoyan-backup-'+Store.today().replace(/-/g,'')+'.json';
          document.body.appendChild(a);a.click();a.remove();
          setTimeout(()=>URL.revokeObjectURL(a.href),3000);
          toast('已导出备份文件 💾');
        }catch(e){toast('导出失败：'+e.message);}
      };
      $('#btn-import').onclick=()=>$('#file-import').click();
      $('#file-import').onchange=e=>{
        const file=e.target.files[0];
        if(!file)return;
        const reader=new FileReader();
        reader.onload=()=>{
          try{
            const parsed=JSON.parse(reader.result);
            if(!parsed||typeof parsed!=='object'||!Array.isArray(parsed.sessions))throw new Error('文件格式不正确');
            Modal.confirm('导入备份？','导入将覆盖当前的全部数据，确定继续吗？',()=>{
              Store.data=Store.normalize(parsed);
              Store.save();App.render();toast('导入成功 ✓');
            },'覆盖导入');
          }catch(err){toast('导入失败：'+err.message);}
        };
        reader.readAsText(file);
        e.target.value='';
      };
      $('#btn-clear').onclick=()=>{
        Modal.confirm('清空所有数据？','将删除全部学习记录、错题、资料、计划等，且无法恢复！建议先导出备份。',()=>{
          try{localStorage.removeItem(Store.KEY);localStorage.removeItem(Timer.KEY);}catch(e){}
          Store.load();
          Timer.mode='focus';Timer.running=false;Timer.remainingMs=Timer.total();Timer.cycles=0;Timer.persist();
          App.render();toast('已清空');
        },'确认清空');
      };
    }
  }
};

function todoRowHTML(t,today){
  const overdue=!t.done&&t.due&&t.due<today;
  return '<div class="todo-row'+(t.done?' done':'')+'">'+
    '<input type="checkbox" data-td="'+t.id+'"'+(t.done?' checked':'')+'>'+
    '<span class="t-text">'+esc(t.text)+'</span>'+
    (t.subject?'<span class="chip" style="'+subChipStyle(t.subject)+'">'+esc(t.subject)+'</span>':'')+
    (t.due?'<span class="t-due'+(overdue?' overdue':'')+'">'+(t.due===today?'今天':(overdue?'逾期 '+t.due:t.due))+'</span>':'')+
    '<button class="icon-btn" data-del-todo="'+t.id+'" title="删除">🗑</button></div>';
}

function heatmapHTML(){
  const goal=Store.data.settings.dailyGoalMin||480;
  const t=parseDate(Store.today());
  const dow=(t.getDay()+6)%7;                       // 周一=0
  const start=new Date(t);
  start.setDate(t.getDate()-(dow+14*7));            // 15 周前（含本周）的周一
  let cells='';
  for(let d=new Date(start);d<=t;d.setDate(d.getDate()+1)){
    const ds=fmtDate(d),v=minOn(ds);
    const lvl=v===0?0:(v<goal*0.25?1:(v<goal*0.5?2:(v<goal?3:4)));
    cells+='<div class="hm-cell l'+lvl+'" title="'+ds+' · '+fmtMin(v)+'"></div>';
  }
  return '<div class="heatmap">'+cells+'</div>'+
    '<div class="hm-legend">少 <span class="hm-cell l0"></span><span class="hm-cell l1"></span>'+
    '<span class="hm-cell l2"></span><span class="hm-cell l3"></span><span class="hm-cell l4"></span>'+
    ' 多（每日目标 '+fmtMin(goal)+'）</div>';
}

function allDays(){
  const ds=Store.data.sessions.map(s=>s.date).sort();
  if(!ds.length)return lastNDays(30);
  return daysRange(ds[0],Store.today());
}

/* ================= 各类弹窗表单 ================= */
function openSessionModal(id){
  const s=id?Store.data.sessions.find(x=>x.id===id):null;
  Modal.open(
    '<h3>'+(s?'编辑学习记录':'添加学习记录')+'</h3>'+
    '<div class="f-row">'+
      '<div><label class="f-label">日期</label><input type="date" id="m-date" class="input" value="'+(s?esc(s.date):Store.today())+'"></div>'+
      '<div><label class="f-label">科目</label><input id="m-subject" class="input" list="subject-list" value="'+esc(s?s.subject:(Store.data.subjects[0]||''))+'"></div></div>'+
    '<div class="f-row">'+
      '<div><label class="f-label">开始时间</label><input type="time" id="m-start" class="input" value="'+esc(s?s.start:'')+'"></div>'+
      '<div><label class="f-label">结束时间</label><input type="time" id="m-end" class="input" value="'+esc(s?s.end:'')+'"></div></div>'+
    '<label class="f-label">备注（可选）</label><input id="m-note" class="input" placeholder="例如：高数第一章习题" value="'+esc(s?s.note:'')+'">'+
    '<div class="modal-actions"><button class="btn" data-close>取消</button><button class="btn primary" id="m-save">保存</button></div>',
    {onMount(){
      $('#m-save').onclick=()=>{
        const date=$('#m-date').value,subject=$('#m-subject').value.trim();
        const stTime=$('#m-start').value,enTime=$('#m-end').value,note=$('#m-note').value.trim();
        if(!date||!subject)return toast('请填写日期和科目');
        if(!stTime||!enTime)return toast('请填写开始和结束时间');
        let min=toMin(enTime)-toMin(stTime);
        if(min<=0)min+=1440;               // 跨零点
        if(min<1)return toast('结束时间需晚于开始时间');
        if(!Store.data.subjects.includes(subject))Store.data.subjects.push(subject);
        const obj={date:date,subject:subject,minutes:min,start:stTime,end:enTime,note:note,src:s?s.src:'manual'};
        if(s)Object.assign(s,obj);
        else Store.data.sessions.push(Object.assign({id:Store.uid(),createdAt:Date.now()},obj));
        Store.save();Modal.close();App.render();toast('已保存 ✓');
      };
    }}
  );
}

function openMaterialModal(id){
  const m=id?Store.data.materials.find(x=>x.id===id):null;
  Modal.open(
    '<h3>'+(m?'编辑资料':'添加学习资料')+'</h3>'+
    '<label class="f-label">名称 *</label><input id="m-title" class="input" value="'+esc(m?m.title:'')+'" placeholder="例如：张宇高数 18 讲">'+
    '<div class="f-row">'+
      '<div><label class="f-label">科目</label><input id="m-subject" class="input" list="subject-list" value="'+esc(m?m.subject:(Store.data.subjects[0]||''))+'"></div>'+
      '<div><label class="f-label">类型</label><select id="m-type" class="input">'+
        MAT_TYPES.map(t=>'<option'+(m&&m.type===t?' selected':'')+'>'+t+'</option>').join('')+'</select></div></div>'+
    '<label class="f-label">链接（可选）</label><input id="m-link" class="input" placeholder="https://..." value="'+esc(m?m.link||'':'')+'">'+
    '<label class="f-label">备注（可选）</label><textarea id="m-note" class="input" placeholder="使用计划、章节进度等">'+esc(m?m.note||'':'')+'</textarea>'+
    '<label class="f-label">学习进度：<span id="m-pv">'+(m?m.progress||0:0)+'%</span></label>'+
    '<input type="range" id="m-progress" min="0" max="100" step="5" value="'+(m?m.progress||0:0)+'" style="width:100%">'+
    '<div class="modal-actions"><button class="btn" data-close>取消</button><button class="btn primary" id="m-save">保存</button></div>',
    {onMount(){
      $('#m-progress').oninput=e=>{$('#m-pv').textContent=e.target.value+'%';};
      $('#m-save').onclick=()=>{
        const title=$('#m-title').value.trim(),subject=$('#m-subject').value.trim();
        if(!title)return toast('请填写资料名称');
        if(subject&&!Store.data.subjects.includes(subject))Store.data.subjects.push(subject);
        const obj={title:title,subject:subject,type:$('#m-type').value,link:$('#m-link').value.trim(),
          note:$('#m-note').value.trim(),progress:+$('#m-progress').value};
        if(m)Object.assign(m,obj);
        else Store.data.materials.push(Object.assign({id:Store.uid(),createdAt:Date.now()},obj));
        Store.save();Modal.close();App.render();toast('已保存 ✓');
      };
    }}
  );
}

function openMistakeModal(id){
  const m=id?Store.data.mistakes.find(x=>x.id===id):null;
  Modal.open(
    '<h3>'+(m?'编辑错题':'记录错题')+'</h3>'+
    '<div class="f-row">'+
      '<div><label class="f-label">科目</label><input id="m-subject" class="input" list="subject-list" value="'+esc(m?m.subject:(Store.data.subjects[0]||''))+'"></div>'+
      '<div><label class="f-label">掌握程度</label><select id="m-mastery" class="input">'+
        [['again','😵 待复习'],['vague','🤔 有点模糊'],['mastered','✅ 已掌握']].map(it=>
          '<option value="'+it[0]+'"'+(m&&m.mastery===it[0]?' selected':'')+'>'+it[1]+'</option>').join('')+'</select></div></div>'+
    '<label class="f-label">题目 *</label><textarea id="m-question" class="input" placeholder="题目内容，可把关键信息打字记录">'+esc(m?m.question:'')+'</textarea>'+
    '<label class="f-label">我的答案（可选）</label><textarea id="m-mine" class="input">'+esc(m?m.myAnswer||'':'')+'</textarea>'+
    '<label class="f-label">正确答案（可选）</label><textarea id="m-answer" class="input">'+esc(m?m.answer||'':'')+'</textarea>'+
    '<label class="f-label">错因分析（可选）</label><textarea id="m-analysis" class="input" placeholder="为什么做错？知识点漏洞？粗心？">'+esc(m?m.analysis||'':'')+'</textarea>'+
    '<label class="f-label">来源（可选）</label><input id="m-source" class="input" placeholder="例如：660题 P23 / 2018 真题" value="'+esc(m?m.source||'':'')+'">'+
    '<div class="modal-actions"><button class="btn" data-close>取消</button><button class="btn primary" id="m-save">保存</button></div>',
    {onMount(){
      $('#m-save').onclick=()=>{
        const subject=$('#m-subject').value.trim(),question=$('#m-question').value.trim();
        if(!question)return toast('请填写题目内容');
        if(!subject)return toast('请填写科目');
        if(!Store.data.subjects.includes(subject))Store.data.subjects.push(subject);
        const obj={subject:subject,question:question,myAnswer:$('#m-mine').value.trim(),answer:$('#m-answer').value.trim(),
          analysis:$('#m-analysis').value.trim(),source:$('#m-source').value.trim(),mastery:$('#m-mastery').value};
        if(m)Object.assign(m,obj);
        else Store.data.mistakes.push(Object.assign({id:Store.uid(),reviews:0,lastReview:'',createdAt:Date.now()},obj));
        Store.save();Modal.close();App.render();toast('已保存 ✓');
      };
    }}
  );
}

function openMistakeDetail(id){
  const m=Store.data.mistakes.find(x=>x.id===id);
  if(!m)return;
  Modal.open(
    '<div class="rev-head"><h3>错题详情</h3><span class="chip" style="'+subChipStyle(m.subject)+'">'+esc(m.subject)+'</span></div>'+
    '<div class="rev-q">'+esc(m.question)+'</div>'+
    (m.myAnswer?'<label class="f-label">我的答案</label><div class="rev-a">'+esc(m.myAnswer)+'</div>':'')+
    (m.answer?'<label class="f-label">正确答案</label><div class="rev-a good">'+esc(m.answer)+'</div>':'')+
    (m.analysis?'<label class="f-label">错因分析</label><div class="rev-a">'+esc(m.analysis)+'</div>':'')+
    '<p class="muted small" style="margin-top:12px">来源：'+esc(m.source||'—')+' · 记录于 '+fmtTs(m.createdAt)+' · 复习 '+(m.reviews||0)+' 次</p>'+
    '<div class="rev-grade">'+
      '<button class="btn" data-g="again">😵 待复习</button>'+
      '<button class="btn" data-g="vague">🤔 有点模糊</button>'+
      '<button class="btn" data-g="mastered">✅ 已掌握</button></div>'+
    '<div class="modal-actions"><button class="btn" data-close>关闭</button></div>',
    {onMount(){
      $$('#modal-root [data-g]').forEach(b=>b.onclick=()=>{
        m.mastery=b.dataset.g;
        m.reviews=(m.reviews||0)+1;
        m.lastReview=Store.today();
        Store.save();Modal.close();App.render();
      });
    }}
  );
}

function startReview(){
  const d=Store.data;
  let pool=d.mistakes.filter(m=>m.mastery!=='mastered');
  if(!pool.length)pool=d.mistakes.slice();
  if(!pool.length)return toast('错题本还是空的，先去记录错题吧');
  let cur=null,count=0;
  const grade=g=>{
    cur.mastery=g;
    cur.reviews=(cur.reviews||0)+1;
    cur.lastReview=Store.today();
    Store.save();
    toast(g==='mastered'?'太棒了，又消灭一道错题！💪':'没关系，多复习几次就熟了');
    show();
  };
  const show=()=>{
    const others=pool.length>1?pool.filter(m=>m!==cur):pool;
    cur=others[Math.floor(Math.random()*others.length)];
    count++;
    Modal.open(
      '<div class="rev-head"><h3>🎲 随机复习 · 第 '+count+' 题</h3>'+
        '<span class="chip" style="'+subChipStyle(cur.subject)+'">'+esc(cur.subject)+'</span></div>'+
      '<div class="rev-q">'+esc(cur.question)+'</div>'+
      '<div id="rev-body"></div>'+
      (cur.source?'<p class="muted small" style="margin-top:10px">来源：'+esc(cur.source)+'</p>':'')+
      '<div class="modal-actions"><button class="btn" id="rev-exit">结束复习</button>'+
        '<button class="btn primary" id="rev-show">显示答案</button></div>',
      {onMount(){
        $('#rev-exit').onclick=()=>{Modal.close();App.render();};
        $('#rev-show').onclick=()=>{
          $('#rev-body').innerHTML=
            (cur.myAnswer?'<label class="f-label">我的答案</label><div class="rev-a">'+esc(cur.myAnswer)+'</div>':'')+
            (cur.answer?'<label class="f-label">正确答案</label><div class="rev-a good">'+esc(cur.answer)+'</div>':'')+
            (cur.analysis?'<label class="f-label">错因分析</label><div class="rev-a">'+esc(cur.analysis)+'</div>':'')+
            '<div class="rev-grade">'+
              '<button class="btn" data-g="again">😵 还不会</button>'+
              '<button class="btn" data-g="vague">🤔 有点模糊</button>'+
              '<button class="btn" data-g="mastered">✅ 已掌握</button></div>';
          $('#rev-show').style.display='none';
          $$('#rev-body [data-g]').forEach(b=>b.onclick=()=>grade(b.dataset.g));
        };
      }}
    );
  };
  show();
}

/* ================= 应用入口 ================= */
const App={
  view:'dashboard',
  f:{
    log:{subject:'',date:''},
    mat:{subject:'',status:''},
    mis:{subject:'',mastery:''},
    stats:{range:7}
  },

  go(v){this.view=v;this.render();},

  render(){
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===this.view));
    $('#main').innerHTML=Views[this.view].render();
    if(Views[this.view].mount)Views[this.view].mount();
    $('#subject-list').innerHTML=Store.data.subjects.map(s=>'<option value="'+esc(s)+'">').join('');
    const dl=daysBetween(Store.today(),Store.data.settings.examDate);
    $('#mini-count').textContent=dl>0?'距考研初试 '+dl+' 天':'考试周，全力以赴！';
    window.scrollTo(0,0);
  },

  onTimerStateChange(){
    Timer.updateUI();
    if(this.view==='focus'||this.view==='dashboard')this.render();
  },

  init(){
    Store.load();
    Timer.init();
    $$('.nav-btn').forEach(b=>b.onclick=()=>App.go(b.dataset.view));
    $('#mini-timer').onclick=()=>App.go('focus');
    document.addEventListener('click',e=>{
      const g=e.target.closest('[data-go]');
      if(g)App.go(g.dataset.go);
    });
    this.render();
  }
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>App.init());
else App.init();

/* PWA：注册 Service Worker（file:// 本地双击打开时自动跳过，不影响使用） */
if('serviceWorker' in navigator && location.protocol!=='file:'){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}
