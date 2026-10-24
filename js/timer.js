'use strict';

/* 番茄钟：基于时间戳计时（标签页切后台/休眠后恢复依然准确），状态持久化 */
const Timer={
  KEY:'kaoyan_timer_v1',
  mode:'focus',        // focus | short | long
  running:false,
  endAt:0,             // 运行时的结束时间戳
  remainingMs:0,       // 暂停/待机时的剩余毫秒
  subject:'',
  cycles:0,            // 本次启动以来完成的专注数
  _ac:null,

  durations(){const p=Store.data.settings.pomo;return{focus:p.focus*60000,short:p.shortBreak*60000,long:p.longBreak*60000};},
  total(){return this.durations()[this.mode];},
  label(){return{focus:'专注',short:'短休息',long:'长休息'}[this.mode];},
  remaining(){return this.running?Math.max(0,this.endAt-Date.now()):this.remainingMs;},

  init(){
    this.subject=Store.data.subjects[0]||'学习';
    let s=null;
    try{s=JSON.parse(localStorage.getItem(this.KEY)||'null');}catch(e){}
    if(s){
      this.mode=['focus','short','long'].indexOf(s.mode)>=0?s.mode:'focus';
      this.subject=s.subject||this.subject;
      this.cycles=s.cycles||0;
      if(s.running&&s.endAt){
        const left=s.endAt-Date.now();
        if(left>-120000){          // 关闭页面期间到期不超过 2 分钟，视为正常完成
          this.running=true;
          this.endAt=s.endAt;
          this.remainingMs=0;      // 下一次 tick 会触发 complete
        }else{                     // 离开太久，作废
          this.running=false;
          this.mode='focus';
          this.remainingMs=this.total();
        }
      }else{
        this.running=false;
        this.remainingMs=typeof s.remainingMs==='number'?s.remainingMs:this.total();
      }
    }
    if(!this.running&&(!(this.remainingMs>0)))this.remainingMs=this.total();
    this.persist();
    setInterval(()=>this.tick(),250);
    this.tick();
  },

  persist(){
    try{
      localStorage.setItem(this.KEY,JSON.stringify({
        mode:this.mode,running:this.running,
        endAt:this.running?this.endAt:0,
        remainingMs:this.running?0:this.remainingMs,
        subject:this.subject,cycles:this.cycles
      }));
    }catch(e){}
  },

  start(){
    if(this.running)return;
    this.ensureAudio();
    this.requestNotify();
    this.endAt=Date.now()+(this.remainingMs>0?this.remainingMs:this.total());
    this.running=true;
    this.persist();
  },
  pause(){
    if(!this.running)return;
    this.remainingMs=Math.max(0,this.endAt-Date.now());
    this.running=false;
    this.persist();
  },
  reset(){
    this.running=false;
    this.remainingMs=this.total();
    this.persist();
  },
  setMode(m){
    if(this.running)return;
    this.mode=m;
    this.remainingMs=this.total();
    this.persist();
  },
  skip(){            // 跳过休息
    this.running=false;
    this.mode='focus';
    this.remainingMs=this.total();
    this.persist();
  },
  finishEarly(){     // 结束专注并记录已专注时长
    const elapsed=this.total()-this.remaining();
    const min=Math.floor(elapsed/60000);
    this.running=false;
    this.mode='focus';
    this.remainingMs=this.total();
    this.persist();
    if(min>=1){
      Store.addSession({date:Store.today(),subject:this.subject,minutes:min,src:'pomo',note:'番茄专注（提前结束）'});
      toast('已记录专注 '+fmtMin(min));
    }else{
      toast('不足 1 分钟，未记录');
    }
    App.onTimerStateChange();
  },

  tick(){
    if(this.running&&this.endAt-Date.now()<=0)this.complete();
    this.updateUI();
  },

  complete(){
    const total=this.total();
    this.running=false;
    if(this.mode==='focus'){
      Store.addSession({date:Store.today(),subject:this.subject,minutes:Math.max(1,Math.round(total/60000)),src:'pomo',note:'番茄专注'});
      this.cycles++;
      const p=Store.data.settings.pomo;
      this.mode=this.cycles%p.longEvery===0?'long':'short';
      this.remainingMs=this.total();
      this.beep();
      this.notify('专注完成！','已专注 '+fmtMin(total/60000)+'，休息一下吧 🍵');
      this.endAt=Date.now()+this.remainingMs;   // 自动开始休息
      this.running=true;
    }else{
      this.beep();
      this.notify('休息结束','开始下一轮专注吧 💪');
      this.mode='focus';
      this.remainingMs=this.total();
    }
    this.persist();
    App.onTimerStateChange();
  },

  updateUI(){
    const rem=this.remaining(),total=this.total();
    const t=document.getElementById('pomo-time');
    if(t)t.textContent=fmtMS(rem);
    const st=document.getElementById('pomo-status');
    if(st)st.textContent=this.label()+' · '+this.subject+(this.running?'':(rem<total&&rem>0?' · 已暂停':''));
    const ring=document.getElementById('pomo-ring');
    if(ring){
      const C=2*Math.PI*110;
      const frac=total>0?Math.min(1,(total-rem)/total):0;
      ring.style.strokeDashoffset=String(Math.round(C*(1-frac)*10)/10);
    }
    const sb=document.getElementById('pomo-start');
    if(sb)sb.textContent=this.running?'⏸ 暂停':((rem<total&&rem>0)?'▶ 继续':'▶ 开始'+(this.mode==='focus'?'专注':'休息'));
    const mini=document.getElementById('mini-timer');
    if(mini){
      const active=this.running||(rem<total&&rem>0);
      if(active){
        mini.hidden=false;
        mini.textContent=(this.mode==='focus'?'🍅 ':'☕ ')+this.label()+' '+fmtMS(rem)+' · '+this.subject;
      }else mini.hidden=true;
    }
  },

  ensureAudio(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!this._ac)this._ac=new AC();
      if(this._ac.state==='suspended')this._ac.resume();
    }catch(e){}
  },
  beep(){
    try{
      if(!this._ac||this._ac.state!=='running')return;
      const ctx=this._ac,now=ctx.currentTime;
      for(let i=0;i<3;i++){
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';
        o.frequency.value=i===2?1174.7:880;
        o.connect(g);g.connect(ctx.destination);
        const t=now+i*0.3;
        g.gain.setValueAtTime(0.0001,t);
        g.gain.exponentialRampToValueAtTime(0.28,t+0.03);
        g.gain.exponentialRampToValueAtTime(0.0001,t+0.26);
        o.start(t);o.stop(t+0.3);
      }
    }catch(e){}
  },
  requestNotify(){
    try{
      if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();
    }catch(e){}
  },
  notify(title,body){
    try{
      if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body:body,silent:true});
    }catch(e){}
  }
};
