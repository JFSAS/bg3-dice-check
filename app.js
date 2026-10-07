'use strict';
const $ = id => document.getElementById(id);
const signed = n => n >= 0 ? `+${n}` : `${n}`;
const defaults = {question:'要不要开始那个一直想做的项目？',context:'你已经准备了很久。现在，让命运推你一把。',skill:'勇气检定',dc:12,ability:2,abilityLabel:'充分准备',proficiency:1,proficiencyLabel:'经验积累',critical:true};
function validate(raw){
 const c={...defaults,...raw};
 for(const [key,max] of [['question',160],['context',240],['skill',30],['abilityLabel',30],['proficiencyLabel',30]]){if(typeof c[key]!=='string'||c[key].length>max||(key!=='context'&&!c[key].trim()))throw Error(`无效字段：${key}`);c[key]=c[key].trim();}
 for(const [key,min,max] of [['dc',1,40],['ability',-20,20],['proficiency',-20,20]]){if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)throw Error(`无效数值：${key}`);}
 if(typeof c.critical!=='boolean')throw Error('critical 必须为布尔值');
 return Object.fromEntries(Object.keys(defaults).map(k=>[k,c[k]]));
}
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Session works even if storage is unavailable. */}}
let config=defaults;try{config=validate(readStore('fate-config-v1',defaults));}catch{}
try{const query=new URLSearchParams(location.search).get('check');if(query)config=validate(JSON.parse(query));}catch(e){console.warn('无法加载 URL 中的检定：',e.message);}
let history=readStore('fate-history-v1',[]);if(!Array.isArray(history))history=[];
history=history.filter(x=>x&&typeof x.question==='string'&&Number.isInteger(x.roll)&&x.roll>=1&&x.roll<=20&&typeof x.success==='boolean').slice(0,100);
let busy=false,loaded=false,sound=readStore('fate-sound-v1',true)!==false;
const sprites={},manifest={},ctx=$('dice').getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const form=$('settingsForm');
function evaluate(roll,c){const critical=c.critical&&(roll===1||roll===20);const total=critical?roll:roll+c.ability+c.proficiency;return {total,critical,success:critical?roll===20:total>=c.dc};}
function probability(c){let successes=0;for(let i=1;i<=20;i++)if(evaluate(i,c).success)successes++;return successes*5;}
function configure(c){if(busy)throw Error('正在检定，请等待结果');config=validate(c);save('fate-config-v1',config);renderConfig();reset();return {...config};}
function renderConfig(){for(const [id,key] of [['question','question'],['context','context'],['skillName','skill'],['dcValue','dc'],['abilityLabelDisplay','abilityLabel'],['proficiencyLabelDisplay','proficiencyLabel']])$(id).textContent=config[key];$('abilityDisplay').textContent=signed(config.ability);$('proficiencyDisplay').textContent=signed(config.proficiency);$('totalBonus').textContent=signed(config.ability+config.proficiency);for(const key of Object.keys(defaults)){const el=form.elements.namedItem(key);if(el.type==='checkbox')el.checked=config[key];else el.value=config[key];}updateChance();}
function formConfig(){const c={};for(const key of Object.keys(defaults)){const el=form.elements.namedItem(key);c[key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;}return validate(c);}
function updateChance(){try{$('chancePreview').textContent=`按当前数值，成功概率为 ${probability(formConfig())}%（每个 D20 点数等概率）。`;}catch{$('chancePreview').textContent='请填写范围内的完整数值。';}}
function draw(name,index){const sheet=sprites[name],m=manifest[name];if(!sheet||!m)return;const tile=m.indices[Math.min(index,m.frames-1)];ctx.clearRect(0,0,512,512);ctx.drawImage(sheet,(tile%m.columns)*256,Math.floor(tile/m.columns)*256,256,256,0,0,512,512);}
function drawTotal(roll,total){draw('d20',roll-1);if(total===roll)return;ctx.drawImage(sprites.d20_faceCover,0,0,256,256,0,0,512,512);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 124px Quadraat';ctx.fillStyle='#eeeeee';ctx.strokeStyle='#0009';ctx.lineWidth=4;ctx.strokeText(total,256,264);ctx.fillText(total,256,264);}
function animate(name,fps=30){return new Promise(resolve=>{if(reduced.matches){draw(name,manifest[name].frames-1);resolve();return;}let start;const tick=t=>{start??=t;const index=Math.floor((t-start)*fps/1000);draw(name,index);if(index>=manifest[name].frames-1)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});}
function wait(ms){return new Promise(r=>setTimeout(r,reduced.matches?0:ms));}
function d20(){const bytes=new Uint32Array(1),limit=Math.floor(4294967296/20)*20;do{crypto.getRandomValues(bytes);}while(bytes[0]>=limit);return bytes[0]%20+1;}
function reset(){ NativeScene.clear();NativeSound.stop(); $('checkStage').classList.remove('rolling','success','failure');$('resultTitle').textContent='';$('calculation').textContent='';$('rollPrompt').textContent=loaded?'点击骰子掷骰':'正在加载骰子…';$('continueButton').hidden=true;$('diceButton').disabled=!loaded;$('diceButton').setAttribute('aria-label','点击骰子进行检定');$('bonusFly').classList.remove('bonus-fly');if(loaded){draw('d20',19);NativeScene.idle(name=>sprites[name],reduced.matches);NativeSound.event('UI_HUD_DiceRoll_Appear');}}
const rollEffects={},fxctx=$('rollVfx').getContext('2d');
function scaleStage(){document.documentElement.style.setProperty('--ui-scale',Math.min(innerWidth/3840,innerHeight/2160));}
addEventListener('resize',scaleStage);scaleStage();
function effectFrame(name,t,x,y,angle=0,scale=1){const im=rollEffects[name];if(!im)return;const [w,h]=name==='d20Explosion'?[178,184]:[216,240];const cols=Math.floor(im.width/w),rows=Math.floor(im.height/h);let i=Math.floor(t/.033);if(name==='d20Explosion')i%=cols*rows;else if(i>=cols*rows)return;fxctx.save();fxctx.translate(x+w/2,y+h/2);fxctx.rotate(angle*Math.PI/180);fxctx.scale(scale,scale);fxctx.drawImage(im,(i%cols)*w,Math.floor(i/cols)*h,w,h,-w/2,-h/2,w,h);fxctx.restore();}
const nativePath=[[0,0,-73],[.07,-256,175],[.15,-200,355],[.6,220,-83],[1.08,-54,-489],[1.52,-144,-299],[1.98,0,-72],[2.43,0,-72]];
function nativeRoll(value){return new Promise(resolve=>{if(reduced.matches){draw(`d20_${value}`,manifest[`d20_${value}`].frames-1);resolve();return;}let start;const tick=now=>{start??=now;const t=(now-start)/1000;let pos=nativePath.at(-1);for(let i=1;i<nativePath.length;i++){const a=nativePath[i-1],b=nativePath[i];if(t<=b[0]){const u=Math.max(0,(t-a[0])/(b[0]-a[0]));pos=[t,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];break;}}$('diceButton').style.transform=`translate(${pos[1]}px,${pos[2]+73}px)`;draw(t<2?'single_roll':`d20_${value}`,t<2?Math.floor(t/.033)%manifest.single_roll.frames:Math.floor((t-2)/.033));fxctx.clearRect(0,0,3840,2160);for(const [at,end,x,y,angle] of [[.07,1.23,1511,1160,-55.17],[.15,1.32,1667,1306,-135.37],[1.03,2.2,1771,348,-322.2],[.53,1.7,2111,758,-234.08]])if(t>=at&&t<end)effectFrame('d20Explosion',t-at,x,y,angle);if(t>=1.92&&t<2.45)effectFrame('popExplosion',t-1.92,1770,738,-39.04,1.58);if(t<3.38)requestAnimationFrame(tick);else{$('diceButton').style.transform='';fxctx.clearRect(0,0,3840,2160);resolve();}};requestAnimationFrame(tick);});}
async function roll(){
 if(busy||!loaded)return;NativeScene.clear();busy=true;const current={...config};$('diceButton').disabled=true;$('settingsButton').disabled=true;$('checkStage').classList.remove('success','failure');$('checkStage').classList.add('rolling');$('continueButton').hidden=true;$('resultTitle').textContent='';$('calculation').textContent='';$('rollPrompt').textContent='掷骰中…';
 const value=d20(),result=evaluate(value,current);
 try{
 await NativeSound.init(sound);
 const rollingAudio=NativeSound.event('UI_HUD_DiceRoll_RollStart');const soundTimer=setTimeout(()=>rollingAudio.stop(),1600);
 await nativeRoll(value);clearTimeout(soundTimer);rollingAudio.stop();$('checkStage').classList.remove('rolling');$('rollPrompt').textContent=`骰子点数 ${value}`;await wait(380);
 let running=value;
 for(const [index,bonus] of (result.critical?[]:[current.ability,current.proficiency]).entries()){
 if(bonus===0)continue;const card=document.querySelectorAll('.bonus-card')[index];card.classList.add('adding');NativeSound.event('UI_HUD_DiceRoll_Bonus_Appear');NativeSound.event(index===0?'UI_HUD_DiceRoll_BonusType_Ability':'UI_HUD_DiceRoll_BonusType_Default');
 await NativeScene.bonus(index,bonus,value,running,running+bonus,name=>sprites[name],()=>{running+=bonus;drawTotal(value,running);NativeSound.event('UI_HUD_DiceRoll_Bonus_NumberAdded_'+(bonus>=0?'Positive':'Negative'));$('calculation').textContent=`检定合计 ${running}`;},reduced.matches);card.classList.remove('adding');
 }
 $('checkStage').classList.add(result.success?'success':'failure');NativeSound.event(`UI_HUD_DiceRoll_Result_${result.critical?(result.success?'20':'1'):(result.success?'Success':'Fail')}`);const resultAnimation=NativeScene.result({roll:value,...result,total:result.critical?value:result.total},name=>sprites[name],reduced.matches);$('resultTitle').textContent=result.critical?(result.success?'大成功':'大失败'):(result.success?'成功':'失败');$('rollPrompt').textContent=result.success?'检定成功':'检定失败';
 $('calculation').textContent=result.critical?`天然 ${value} · ${result.success?'自动成功':'自动失败'}`:`${value} ${signed(current.ability)} ${signed(current.proficiency)} = ${result.total} · 难度 ${current.dc} · ${result.success?'检定通过':'检定未通过'}`;
 await resultAnimation;
 const record={...current,roll:value,...result,timestamp:new Date().toISOString()};history.unshift(record);history=history.slice(0,100);save('fate-history-v1',history);renderHistory();$('continueButton').hidden=false;$('diceButton').setAttribute('aria-label','本次检定已结束，请点击再进行一次检定');
 window.dispatchEvent(new CustomEvent('fate-check:result',{detail:{...record}}));
 }catch(e){console.error(e);$('rollPrompt').textContent='素材播放异常，请重新开始。';$('continueButton').hidden=false;}
 finally{busy=false;$('settingsButton').disabled=false;}
}
function renderHistory(){$('historyCount').textContent=history.length;const list=$('historyList');list.replaceChildren();if(!history.length){const p=document.createElement('p');p.className='empty';p.textContent='你的冒险尚未留下记录。';list.append(p);return;}for(const h of history){const item=document.createElement('div');item.className='history-item'+(h.success?'':' failed');const p=document.createElement('p'),b=document.createElement('b'),small=document.createElement('small');p.textContent=h.question;b.textContent=h.critical?(h.success?'大成功':'大失败'):(h.success?'成功':'失败');const time=new Date(h.timestamp);small.textContent=(h.critical?`天然 ${h.roll} · ${h.success?'自动成功':'自动失败'}`:`D20 ${h.roll} ${signed(h.ability??0)} ${signed(h.proficiency??0)} = ${h.total} / DC ${h.dc}`)+` · ${Number.isNaN(time.getTime())?'':time.toLocaleString('zh-CN')}`;item.append(b,p,small);list.append(item);}}
$('diceButton').addEventListener('click',roll);$('continueButton').addEventListener('click',reset);
for(const [button,dialog] of [['settingsButton','settingsDialog'],['historyButton','historyDialog'],['aboutButton','aboutDialog']])$(button).addEventListener('click',()=>$(dialog).showModal());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
form.addEventListener('input',updateChance);form.addEventListener('submit',e=>{e.preventDefault();configure(formConfig());$('settingsDialog').close();});
$('clearHistory').addEventListener('click',()=>{history=[];save('fate-history-v1',history);renderHistory();});
function renderSound(){$('soundButton').setAttribute('aria-pressed',String(sound));$('soundButton').setAttribute('aria-label',sound?'关闭音效':'开启音效');$('soundButton').querySelector('span').textContent=sound?'音效开启':'音效关闭';$('soundButton').firstChild.textContent=sound?'♫ ':'♪ ';}
$('soundButton').addEventListener('click',()=>{sound=!sound;save('fate-sound-v1',sound);NativeSound.setEnabled(sound);if(sound)NativeSound.init(true).then(()=>NativeSound.event('UI_HUD_DiceRoll_Appear')).catch(console.error);renderSound();});
// Local integration seam: a future Agent supplies explicit configuration and listens for the result event.
window.FateCheck=Object.freeze({configure,getConfig:()=>({...config}),getState:()=>({busy,loaded}),getHistory:()=>history.map(h=>({...h}))});
renderConfig();renderHistory();renderSound();reset();
(async()=>{try{Object.assign(manifest,window.__FATE_ASSETS__?.manifest??await(await fetch('assets/dice/manifest.json')).json());await Promise.all(Object.keys(manifest).map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{sprites[name]=im;resolve();};im.onerror=()=>reject(Error(`无法加载 ${name}`));im.src=window.__FATE_ASSETS__?.images[name]??`assets/dice/${name}.webp`;})));await Promise.all(['d20Explosion','popExplosion'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{rollEffects[name]=im;resolve();};im.onerror=reject;im.src=`assets/ui/VFX/${name}.webp`;})));await Promise.all([NativeSound.ready,NativeScene.ready,document.fonts.ready,document.fonts.load('bold 62px Quadraat')]);loaded=true;reset();}catch(e){$('rollPrompt').textContent='素材加载失败，请通过本地服务器打开网页。';console.error(e);}})();
for(const card of document.querySelectorAll('.bonus-card'))card.addEventListener('mouseenter',()=>{if(!busy)NativeSound.event('UI_Shared_Hover');});
for(const button of document.querySelectorAll('button')){
 if(button.id==='diceButton'||button.id==='continueButton')continue;
 button.addEventListener('mouseenter',()=>NativeSound.event('UI_Shared_Hover'));
 button.addEventListener('click',()=>{if(sound)NativeSound.init(true).then(()=>NativeSound.event('UI_Shared_Click')).catch(console.error);});
}
