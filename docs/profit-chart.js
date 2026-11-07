import {inPeriod, validShowDate} from './model.js';

// Daily cumulative realized profit, starting at zero for the selected period.
export function profitSeries(state, from='', to='') {
    const daily=new Map(); let undated=0;
    const add=(date,delta)=>{
        if(!validShowDate(date)){undated++;return;}
        if(inPeriod(date,from,to)) daily.set(date,(daily.get(date)||0)+delta);
    };
    state.sales.forEach(s=>add(s.date,s.total-s.cost-s.fees));
    state.expenses.forEach(e=>add(e.date,-e.amount));
    const dates=[...daily.keys()].sort();
    if(!dates.length)return {points:[],undated};
    const first=from || dates[0], last=to || dates.at(-1);
    const dayBefore=date=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);};
    const points=[{date:dayBefore(first),value:0,delta:0,opening:true}]; let value=0;
    for(const date of dates){
        // A flat point before each event keeps quiet days flat instead of implying trades.
        const previous=dayBefore(date);
        if(previous>points.at(-1).date)points.push({date:previous,value,delta:0});
        const delta=daily.get(date); value+=delta; points.push({date,value,delta});
    }
    if(last>points.at(-1).date)points.push({date:last,value,delta:0});
    return {points,undated};
}
const money=v=>(v/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const time=d=>Date.parse(d+'T12:00:00Z');
export function renderProfitChart(host,state,from='',to='',compact=false){
    const {points,undated}=profitSeries(state,from,to);
    const total=points.at(-1)?.value || 0;
    host.innerHTML=`<div class="profit-chart-head"><div><p class="panel-kicker">THE BIGGER PICTURE</p><h2 id="profit-chart-title">Profit over time</h2><p class="chart-sub">Cumulative net profit · ${from||to?'Selected period':'All time'} · Starts at $0</p></div><div class="chart-total ${total<0?'negative':'positive'}">${money(total)}<small>Sales profit minus expenses</small></div></div><div class="chart-legend"><span class="up">Rising profit</span><span class="down">Falling profit</span></div><div id="profit-plot"></div><div class="chart-inspector" ${points.length?'':'hidden'}><p id="chart-reading" role="status" aria-live="polite"></p><label for="profit-point">Drag the chart or explore timeline</label><input id="profit-point" type="range" min="0" max="${Math.max(0,points.length-1)}" value="${Math.max(0,points.length-1)}" step="1"></div><p class="chart-note">Includes sold-card costs, selling fees, and business expenses. Unsold inventory is excluded.${undated?' Undated records are not plotted.':''}</p>`;
    const plot=host.querySelector('#profit-plot');
    if(!points.length){plot.innerHTML='<div class="chart-empty"><svg viewBox="0 0 800 130" aria-hidden="true"><path d="M0 95H800M0 55H800M0 15H800" stroke="#e6ebf3"/><path d="M0 95H800" stroke="#a8b5cc" stroke-width="2" stroke-dasharray="5 7"/></svg><b>Your profit story starts with your first transaction.</b><p>Record a sale or expense to see your chart here.</p></div>';return;}
    const W=compact ? 340 : 1000, H=compact ? 218 : 270;
    const L=compact ? 48 : 78, R=compact ? 8 : 24, T=22, B=38;
    const width=W-L-R, height=H-T-B;
    const axisMoney = new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1
    });
    const min=Math.min(0,...points.map(p=>p.value)), max=Math.max(0,...points.map(p=>p.value));
    const pad=Math.max(100,(max-min)*.12), low=min-pad,high=max+pad;
    const start=time(points[0].date),span=Math.max(86400000,time(points.at(-1).date)-start);
    const x=p=>L+(time(p.date)-start)/span*width,y=v=>T+(high-v)/(high-low)*height;
    let markup='';
    for(let i=0;i<5;i++){const v=low+(high-low)*i/4;const py=y(v);markup+=`<line x1="${L}" x2="${W-R}" y1="${py}" y2="${py}" stroke="#e8edf5"/><text x="${L-12}" y="${py+4}" text-anchor="end" class="chart-axis">${compact ? axisMoney.format(v/100) : money(v)}</text>`;}
    markup+=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="#b6c2d5" stroke-dasharray="4 5"/>`;
    for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],color=b.value>a.value?'#15976c':b.value<a.value?'#d55063':'#95a4bb';
        markup+=`<path d="M${x(a)},${y(a.value)} L${x(b)},${y(b.value)} L${x(b)},${y(0)} L${x(a)},${y(0)}Z" fill="${color}" opacity=".065"/><path d="M${x(a)},${y(a.value)} L${x(b)},${y(b.value)}" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    }
    const labels = compact ? [0, points.length - 1] : [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    labels.forEach(i=>{const p=points[i];markup+=`<text x="${x(p)}" y="${H-10}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}" class="chart-axis">${dateLabel(p.date)}</text>`;});
    markup+='<line id="chart-crosshair" stroke="#617392" stroke-dasharray="3 4"/><circle id="chart-dot" r="5" fill="#4265dc" stroke="white" stroke-width="3"/><g id="chart-tooltip" pointer-events="none" visibility="hidden"><rect width="182" height="74" rx="9" fill="#182e50" stroke="#47628c"/><text id="chart-tip-date" x="12" y="19" fill="#b4c6e1" font-size="10"></text><text id="chart-tip-profit" x="12" y="42" fill="white" font-size="18" font-weight="700"></text><text id="chart-tip-change" x="12" y="60" fill="#b4c6e1" font-size="10"></text></g>';
    plot.innerHTML=`<svg id="profit-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative net profit: ${money(total)}. Green segments rise; red segments fall. Drag across the line or use Explore timeline below for date and value details.">${markup}</svg>`;
    const range=host.querySelector('#profit-point'),svg=plot.querySelector('svg');
    const inspect=(index,showTip=true)=>{
        const p=points[index];
        host.querySelector('#chart-reading').textContent=`${dateLabel(p.date)} · ${p.opening?'Opening balance':money(p.value)+' cumulative'} · ${p.opening?'$0.00':(p.delta>0?'+':'')+money(p.delta)+' daily change'}`;
        const tooltip=plot.querySelector('#chart-tooltip');
        tooltip.setAttribute('visibility',showTip?'visible':'hidden');
        tooltip.setAttribute('transform',`translate(${Math.max(L,Math.min(W-R-182,x(p)-91))},${y(p.value)>110?Math.max(T,y(p.value)-90):Math.min(H-B-74,y(p.value)+16)})`);
        plot.querySelector('#chart-tip-date').textContent=dateLabel(p.date);
        plot.querySelector('#chart-tip-profit').textContent=money(p.value);
        plot.querySelector('#chart-tip-change').textContent=p.opening?'Opening balance':`${p.delta>0?'+':''}${money(p.delta)} daily change`;
        range.value=index; range.setAttribute('aria-valuetext',`${dateLabel(p.date)}: ${money(p.value)} cumulative profit`);
        const line=plot.querySelector('#chart-crosshair');line.setAttribute('visibility',showTip?'visible':'hidden');line.setAttribute('x1',x(p));line.setAttribute('x2',x(p));line.setAttribute('y1',T);line.setAttribute('y2',H-B);
        const dot=plot.querySelector('#chart-dot');dot.setAttribute('visibility',showTip?'visible':'hidden');dot.setAttribute('cx',x(p));dot.setAttribute('cy',y(p.value));dot.setAttribute('fill',p.delta<0?'#d55063':p.delta>0?'#15976c':'#617392');
    };
    const hideInspection=()=>{
        for(const selector of ['#chart-tooltip','#chart-crosshair','#chart-dot'])plot.querySelector(selector).setAttribute('visibility','hidden');
    };
    range.oninput=()=>inspect(Number(range.value),false);
    let activePointer=null;
    const inspectPointer=e=>{
        const rect=svg.getBoundingClientRect();
        if(e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom){hideInspection();return;}
        const px=(e.clientX-rect.left)/rect.width*W;
        let nearest=0;
        points.forEach((p,i)=>{if(Math.abs(x(p)-px)<Math.abs(x(points[nearest])-px))nearest=i;});
        inspect(nearest);
    };
    svg.onpointerdown=e=>{
        if(!e.isPrimary || e.button!==0)return;
        activePointer=e.pointerId;svg.setPointerCapture(e.pointerId);
        svg.classList.add('is-dragging');inspectPointer(e);e.preventDefault();
    };
    svg.onpointermove=e=>{if(e.pointerId===activePointer || (activePointer===null && e.pointerType==='mouse'))inspectPointer(e);};
    const finishDrag=e=>{
        if(e.pointerId!==activePointer)return;
        if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
        activePointer=null;svg.classList.remove('is-dragging');
    };
    svg.onpointerup=e=>{finishDrag(e);const rect=svg.getBoundingClientRect();if(e.pointerType!=='mouse' || e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom)hideInspection();};
    svg.onpointercancel=e=>{finishDrag(e);hideInspection();};
    svg.onpointerleave=hideInspection;
    svg.onlostpointercapture=()=>{activePointer=null;svg.classList.remove('is-dragging');};
    inspect(points.length-1,false);
}
