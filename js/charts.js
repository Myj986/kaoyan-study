'use strict';

/* 手写 Canvas 图表：柱状图 / 环形图 / 进度环（无第三方依赖） */
const Charts={
  prep(cv,w,h){
    const dpr=window.devicePixelRatio||1;
    cv.width=Math.max(1,Math.round(w*dpr));
    cv.height=Math.max(1,Math.round(h*dpr));
    const ctx=cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return ctx;
  },
  rr(ctx,x,y,w,h,r){
    r=Math.max(0,Math.min(r,h/2,w/2));
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  },
  /* items: [{label,value,color?}]，值为分钟 */
  bar(cv,items,opts){
    opts=opts||{};
    const w=cv.clientWidth||560,h=cv.clientHeight||240;
    const ctx=this.prep(cv,w,h);
    const n=items.length;
    if(!n)return;
    const padS=4,padT=22,padB=20,gap=n>24?2:(n>12?5:10);
    const bw=Math.max(3,(w-padS*2-gap*(n-1))/n);
    const max=Math.max(1,Math.max.apply(null,items.map(i=>i.value)));
    const every=n<=12?1:Math.ceil(n/12);
    items.forEach((it,i)=>{
      const bh=it.value>0?Math.max(4,it.value/max*(h-padT-padB)):2;
      const x=padS+i*(bw+gap),y=h-padB-bh;
      ctx.fillStyle=it.value>0?(it.color||opts.color||'#4f6ef7'):'#e8ecf5';
      this.rr(ctx,x,y,bw,bh,Math.min(5,bw/2));
      ctx.fill();
      ctx.textAlign='center';
      ctx.font='10px system-ui,sans-serif';
      if(i%every===0){
        ctx.fillStyle='#8b93ab';
        ctx.fillText(it.label,x+bw/2,h-6);
        if(it.value>0){ctx.fillStyle='#4a5170';ctx.fillText(fmtH(it.value),x+bw/2,y-5);}
      }
    });
  },
  /* segs: [{label,value,color}] */
  donut(cv,segs,opts){
    opts=opts||{};
    const w=cv.clientWidth||170,h=cv.clientHeight||170;
    const ctx=this.prep(cv,w,h);
    const cx=w/2,cy=h/2,r=Math.min(w,h)/2-8,total=segs.reduce((a,s)=>a+s.value,0);
    ctx.lineWidth=20;
    if(!total){
      ctx.strokeStyle='#edf0f7';
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    }else{
      let a0=-Math.PI/2;
      segs.forEach(s=>{
        if(s.value<=0)return;
        const a1=a0+Math.PI*2*s.value/total;
        ctx.strokeStyle=s.color;
        ctx.beginPath();ctx.arc(cx,cy,r,a0,a1);ctx.stroke();
        a0=a1;
      });
    }
    if(opts.centerText){
      ctx.fillStyle='#1f2433';ctx.font='700 17px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(opts.centerText,cx,cy-(opts.centerSub?7:0));
    }
    if(opts.centerSub){
      ctx.fillStyle='#8b93ab';ctx.font='10.5px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(opts.centerSub,cx,cy+13);
    }
  },
  ring(cv,pct,opts){
    opts=opts||{};
    const w=cv.clientWidth||120,h=cv.clientHeight||120;
    const ctx=this.prep(cv,w,h);
    const cx=w/2,cy=h/2,r=Math.min(w,h)/2-7;
    pct=Math.max(0,Math.min(1,pct||0));
    ctx.lineWidth=11;ctx.lineCap='round';
    ctx.strokeStyle=opts.track||'#edf0f7';
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    if(pct>0){
      ctx.strokeStyle=opts.color||'#4f6ef7';
      ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);ctx.stroke();
    }
    if(opts.centerText){
      ctx.fillStyle=opts.textColor||'#1f2433';ctx.font='700 19px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(opts.centerText,cx,cy);
    }
  }
};
