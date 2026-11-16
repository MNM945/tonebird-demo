/* Local interaction demo. Chat content stays in memory; no content is persisted. */
const el=id=>document.getElementById(id);
const overlay=el('overlay'),orb=el('orb'),launcher=el('launcher'),idea=el('idea');
const input=el('input'),send=el('send'),status=el('status'),play=el('play'),messages=el('messages');
const chat=document.querySelector('.chat'),orbArt=orb.querySelector('.orb-art');
const contextInput=el('context-input'),intentInput=el('intent-input');
const primary=el('primary-action'),secondary=el('secondary-action');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const demoContext='Sarah: Hi! Have you had a chance to look at the proposal?\nMe: Yes, the direction looks good. I’m checking the timeline with my team now.\nSarah: Great! Would Thursday afternoon work for a quick call to go over the details?';
const scenes={
  normal:{name:'Sarah Chen',avatar:'S',state:'online',preview:'Would Thursday afternoon work?',messages:[
    {text:'Hi! Have you had a chance to look at the proposal?',time:'10:18'},
    {mine:true,text:'Yes, the direction looks good. I’m checking the timeline with my team now.',time:'10:24　✓✓'},
    {text:'Great! Would Thursday afternoon work for a quick call to go over the details?',time:'10:26'}
  ],composer:'',context:demoContext,intent:'',replyIntent:''},
  exception:{name:'Alex Morgan',avatar:'A',state:'online',preview:'Tomorrow at 2:30? 😊',messages:[
    {text:'The updated proposal is ready! ✨ Budget: $8,900 (•‿•)',time:'14:08'},
    {mine:true,text:'Thanks! I’ll check the details and the attachment 👍',time:'14:10　✓✓'},
    {text:'Can we go through it tomorrow at 2:30? 😊 Bring your questions — coffee is on me ☕',time:'14:12'}
  ],composer:'',context:'',intent:'',replyIntent:''}
};
const cleanExceptionContext='Alex: The updated proposal is ready! ✨ Budget: $8,900 (•‿•)\nMe: Thanks! I’ll check the details and the attachment 👍\nAlex: Can we go through it tomorrow at 2:30? 😊 Bring your questions — coffee is on me ☕';
const corruptedExceptionContext='Alex: The updated pr�posal is ready! âœ¨ Budget: $8,9□0 (â€¢â€¿â€¢)\nMe: Thanks! I’ll check the details and the attachm�nt ðŸ‘�\nAlex: Can we go through it tomorrow at 2:3□? ðŸ˜Š Bring your questions — coffee is on me â˜• [text missing]';
scenes.exception.context=corruptedExceptionContext;
const sampleIdea='That works for me. Suggest 3 PM and keep it friendly.';
let view='context',scenario=new URLSearchParams(location.search).get('scene')==='exception'?'exception':'normal',current=0,candidates=[],confirmedContext=null,comparing=false;
let pendingTimer=0,pendingId=0,closeTimer=0,demoTimers=[],demoRunning=false,copying=false,copyId=0;
let suppressHover=false,touchReveal=false,restoringFocus=false,pointerNear=false,returnFocus=orb;
let sessionSource=null,sourceKind='visible',contextError='',replyIntent='';
const isOpen=()=>overlay.classList.contains('open');
const isCapturing=()=>isOpen()&&view==='intent';
const expanded=()=>launcher.classList.contains('expanded');
const keyboardInLauncher=()=>[orb,idea].some(button=>document.activeElement===button&&button.matches(':focus-visible'));
function announce(text){status.textContent=text}
function stopDemo(){demoTimers.forEach(clearTimeout);demoTimers=[];demoRunning=false;play.disabled=false;play.textContent='▶ Play demo'}
function cancelPending(){clearTimeout(pendingTimer);pendingTimer=0;pendingId++}
function afterRead(fn,delay=700){cancelPending();const id=pendingId;pendingTimer=setTimeout(()=>{pendingTimer=0;if(id===pendingId&&isOpen())fn()},delay)}
function clearClose(){clearTimeout(closeTimer);closeTimer=0}
function resetOrb(){['--orb-x','--orb-y','--orb-scale'].forEach(name=>orbArt.style.removeProperty(name))}
function placeTip(){
  const tip=launcher.querySelector(launcher.dataset.tip==='idea'?'.idea-tip':'.reply-tip');
  launcher.classList.toggle('tip-right',orb.getBoundingClientRect().left+2-tip.getBoundingClientRect().width<chat.getBoundingClientRect().left+8);
}
function expandLauncher(tip='reply',force=false){
  if((isOpen()&&!isCapturing())||(!force&&suppressHover))return;
  clearClose();launcher.classList.add('expanded');launcher.dataset.tip=tip;idea.tabIndex=0;placeTip();
}
function collapseLauncher(reset=true){clearClose();launcher.classList.remove('expanded');idea.tabIndex=-1;if(reset)resetOrb()}
function scheduleCollapse(){
  if(closeTimer||isCapturing()||keyboardInLauncher()||demoRunning)return;
  closeTimer=setTimeout(()=>{closeTimer=0;if(!keyboardInLauncher()&&!isCapturing())collapseLauncher(!pointerNear)},180);
}
function updateFooter(){
  const labels={loading:['Reading…','Review context'],context:['Confirm & generate','Back to replies'],replies:[scenario==='exception'?'copy ⏎':'insert ⏎','Tweak'],intent:['Finish & review','Review context'],tweak:[scenario==='exception'?'copy ⏎':'insert ⏎','‹ Back'],blocked:[copying?'Copying…':'Copy reply','‹ Back']};
  [primary.textContent,secondary.textContent]=labels[view];
  primary.disabled=view==='loading'||(view==='blocked'&&copying)||(view==='context'&&!contextInput.value.trim())||(view==='intent'&&!intentInput.value.trim());
  secondary.hidden=view==='loading'||(view==='context'&&!confirmedContext);
}
function setView(next,focusId=null){
  if(view==='blocked'&&next!=='blocked'){copyId++;copying=false}
  view=next;overlay.dataset.view=next;
  document.querySelectorAll('.panel-view').forEach(section=>{section.hidden=section.id!==`view-${next}`&&!(next==='tweak'&&section.id==='view-replies')});
  el('reply-tools').hidden=next!=='replies';
  const titles={loading:'Preparing replies',context:'Review context',replies:'Choose a reply',intent:'Say your idea',tweak:'Adjust tone',blocked:'Copy your reply'};
  el('panel-title').textContent=titles[next];el('panel-body').scrollTop=0;
  overlay.setAttribute('aria-busy',String(next==='loading'));updateFooter();
  if(focusId)el(focusId).focus({preventScroll:true});
}
function openPanel(trigger){
  returnFocus=trigger||orb;overlay.classList.add('open');overlay.inert=false;overlay.setAttribute('aria-hidden','false');
  orb.setAttribute('aria-expanded','true');suppressHover=true;collapseLauncher();
}
function hide(restore=true){
  stopDemo();cancelPending();copyId++;copying=false;overlay.classList.remove('open');overlay.inert=true;overlay.setAttribute('aria-hidden','true');overlay.setAttribute('aria-busy','false');
  orb.setAttribute('aria-expanded','false');idea.setAttribute('aria-expanded','false');launcher.classList.remove('capturing');suppressHover=true;collapseLauncher();
  if(restore){restoringFocus=true;(returnFocus===idea?orb:returnFocus).focus({preventScroll:true});restoringFocus=false}
}
function dismiss(){hide();announce('Closed. Your edits are available when you reopen.')}
function saveSceneState(){const state=scenes[scenario];state.composer=input.value;state.intent=intentInput.value;state.context=contextInput.value;state.replyIntent=replyIntent}
function renderScene(){
  const scene=scenes[scenario];
  el('side-avatar').textContent=scene.avatar;el('chat-avatar').textContent=scene.avatar;
  el('side-name').textContent=scene.name;el('chat-name').textContent=scene.name;
  el('side-preview').textContent=scene.preview;el('chat-state').textContent=scene.state;
  const date=document.createElement('span');date.className='date';date.textContent='TODAY';messages.replaceChildren(date);
  scene.messages.forEach(item=>{const bubble=document.createElement('div');bubble.className=item.mine?'bubble mine':'bubble';bubble.appendChild(document.createTextNode(item.text));const time=document.createElement('small');time.textContent=item.time;bubble.appendChild(time);messages.appendChild(bubble)});
  messages.scrollTop=messages.scrollHeight;input.value=scene.composer;send.disabled=!scene.composer.trim();intentInput.value=scene.intent;contextInput.value=scene.context;replyIntent=scene.replyIntent;sessionSource=sourceSnapshot();sourceKind='visible';
}
function visibleLines(){
  const sender=scenes[scenario].name;
  return [...messages.querySelectorAll('.bubble')].map(bubble=>`${bubble.classList.contains('mine')?'Me':sender}: ${[...bubble.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join('').trim()}`);
}
function sourceSnapshot(){return scenario==='exception'?corruptedExceptionContext:visibleLines().join('\n')}
function invalidateContext(){confirmedContext=null;candidates=[];contextError='';updateFooter();updateContextNotice()}
function updateContextNotice(){
  const notice=el('context-notice');notice.dataset.tone=contextError||scenario!=='normal'?'warning':'info';
  notice.textContent=contextError||(scenario==='exception'?'Some characters could not be read correctly. Check the garbled text against the conversation, or paste the correct messages before generating a reply.':'Review or correct the conversation used for this reply.');
  el('use-visible').textContent=scenario==='exception'?'Use sample context':'Use visible conversation';
  const count=contextInput.value.trim().length;
  const lines=contextInput.value.trim().split('\n').filter(Boolean);
  el('context-preview').textContent=lines.length?lines.at(-1):'No conversation captured. Paste the relevant messages.';
  el('context-meta').textContent=`${sourceKind==='manual'?'Manually provided / edited':sourceKind==='sample'?'Selected sample':'Visible conversation'} · ${count} characters. Remove unrelated content or correct errors.`;
  contextInput.setAttribute('aria-invalid',String(Boolean(contextError&&!contextInput.value.trim())));
}
function showContext(focus=false){
  cancelPending();launcher.classList.remove('capturing');idea.setAttribute('aria-expanded','false');collapseLauncher();
  el('context-details').open=focus||scenario!=='normal'||Boolean(contextError);
  updateContextNotice();setView('context',focus?'context-input':null);
}
function startReply(trigger=orb){
  // Repeated activation is idempotent: it must not cancel reading or close the panel.
  if(isOpen())return;
  stopDemo();openPanel(trigger);setView('loading','close');el('loading-label').textContent='Reading conversation…';
  afterRead(()=>{
    const snapshot=sourceSnapshot();
    if(snapshot!==sessionSource){
      const preserveManual=sessionSource!==null&&sourceKind!=='visible';sessionSource=snapshot;
      if(!preserveManual){contextInput.value=snapshot;sourceKind='visible'}
      invalidateContext();if(preserveManual)contextError='The conversation has changed. Your edits were kept; check for new messages.';
    }
    showContext();
    if(scenario==='normal'&&!contextError){confirmContext(false)}else announce('Access is limited. Review the conversation before continuing.');
  });
}
function showIdea(trigger=idea){
  if(isOpen())return;
  stopDemo();openPanel(trigger);launcher.classList.add('capturing');suppressHover=false;
  idea.setAttribute('aria-expanded','true');
  if(!intentInput.value.trim())intentInput.value=sampleIdea;
  setView('intent','intent-input');expandLauncher('idea',true);announce('Edit your idea, then select Finish & review to continue.');
}
function finishIdea(){
  if(!intentInput.value.trim())return;
  const snapshot=sourceSnapshot();if(snapshot!==sessionSource){sessionSource=snapshot;contextInput.value=snapshot;sourceKind='visible'}
  replyIntent=intentInput.value.trim();scenes[scenario].replyIntent=replyIntent;invalidateContext();showContext(true);
}
function buildCandidates(text,draft){
  if(draft&&draft!==sampleIdea){
    const chinese=/[\u3400-\u9fff]/.test(draft);
    return [draft,chinese?`Thanks! ${draft}`:`Thanks! ${draft}`,chinese?`${draft}\nLet me know if that works for you.`:`${draft}\nLet me know if that works for you.`];
  }
  const days={monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday','周一':'Monday','周二':'Tuesday','周三':'Wednesday','周四':'Thursday','周五':'Friday','周六':'Saturday','周日':'Sunday','星期一':'Monday','星期二':'Tuesday','星期三':'Wednesday','星期四':'Thursday','星期五':'Friday','星期六':'Saturday','星期日':'Sunday'};
  if(scenario==='exception'&&text.replace(/\s/g,'')===cleanExceptionContext.replace(/\s/g,''))return ['Tomorrow at 2:30 works for me! I’ll bring my questions 😊','Sounds great — see you tomorrow at 2:30! Thanks for the coffee ☕','2:30 tomorrow is perfect. I’ll review the proposal beforehand (•‿•)'];
  const matches=[...text.matchAll(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|周[一二三四五六日]|星期[一二三四五六日]/gi)];
  if(!matches.length)return null;
  const normalize=source=>source.replace(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/gi,'{day}').replace(/\r/g,'').trim();
  if(![demoContext,demoContext.split('\n').at(-1)].some(example=>normalize(example)===normalize(text)))return null;
  const day=days[matches.at(-1)[0].toLowerCase()];
  // Small, explicit scheduling example; arbitrary topics require a user-provided draft.
  return [`${day} works for me. Would 3 PM suit you?`,`Thanks for checking! ${day} works well for me. How about 3 PM?`,`I’m available on ${day} at 3 PM. Please let me know if that time works for you.`];
}
function confirmContext(reviewed=true){
  if(view!=='context')return false;
  const text=contextInput.value.trim(),draft=replyIntent.trim();
  if(!text){contextError='Please provide the relevant conversation first.';updateContextNotice();el('context-details').open=true;contextInput.focus();return false}
  if(scenario==='exception'&&/[�□]|内容截断|终��/.test(text)){contextError='Some content is missing. Correct the context or use the sample before generating.';updateContextNotice();el('context-details').open=true;contextInput.focus();return false}
  const generated=buildCandidates(text,draft);
  if(!generated){contextError=scenario==='exception'?'Correct the unreadable text or use the sample before generating.':'This demo supports the sample conversation. Use it to continue.';updateContextNotice();el('context-details').open=true;contextInput.focus();return false}
  confirmedContext={text,draft,source:sourceKind,scenario,reviewed};candidates=generated;current=0;comparing=false;renderCandidates();
  setView('loading','close');el('loading-label').textContent='Preparing replies from the confirmed context…';
  afterRead(()=>{setView('replies');announce('Three replies are ready. Compare them or edit the context.')},800);
  return true;
}
function renderCandidates(){
  if(!candidates.length)return;
  el('suggestion').textContent=candidates[current];
  const dots=el('dots');dots.replaceChildren();const count=document.createElement('span');count.className='sr';count.textContent=`Selected ${current+1} / ${candidates.length}`;dots.appendChild(count);
  candidates.forEach((_,index)=>{const dot=document.createElement('i');dot.className=index===current?'active':'';dot.setAttribute('aria-hidden','true');dots.appendChild(dot)});
  el('context-summary').textContent=`${confirmedContext?.reviewed?'Confirmed':'Captured'} · ${confirmedContext?.source==='visible'?'Visible content':'Provided content'} · For this reply`;
  const list=el('candidate-list');list.replaceChildren();
  candidates.forEach((text,index)=>{
    const button=document.createElement('button');button.type='button';button.className='candidate';button.dataset.index=index;
    button.setAttribute('role','radio');button.setAttribute('aria-checked',String(index===current));button.tabIndex=index===current?0:-1;
    const heading=document.createElement('span');heading.className='candidate-heading';heading.textContent=`Reply ${index+1}`;
    const mark=document.createElement('span');mark.className='selected-mark';mark.textContent=index===current?'✓ Selected':'Select reply';
    const body=document.createElement('span');body.className='candidate-text';body.textContent=text;
    heading.appendChild(mark);button.append(heading,body);list.appendChild(button);
  });
  list.hidden=!comparing;el('single-reply').hidden=comparing;el('compare').setAttribute('aria-expanded',String(comparing));el('compare').textContent=comparing?'Collapse comparison':'Compare';
}
function choose(index,focus=false){if(!candidates.length)return;current=(index+candidates.length)%candidates.length;renderCandidates();if(focus){const button=el('candidate-list').children[current];button.focus({preventScroll:true});button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'})}}
function insertReply(){
  if(!confirmedContext||!candidates.length)return;
  if(scenario==='exception'){el('copy-text').value=candidates[current];el('copy-status').textContent='Copy the reply, then paste it into the chat.';setView('blocked','primary-action');return}
  const prior=input.value.trim();input.value=prior?`${input.value}\n${candidates[current]}`:candidates[current];scenes[scenario].composer=input.value;send.disabled=false;
  hide(false);input.focus();announce(prior?'Added to your draft. Review it before sending.':'Inserted into the composer. Review it before sending.');
}
async function copyReply(){
  if(copying)return;copying=true;const id=++copyId;updateFooter();
  try{
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(el('copy-text').value);if(id===copyId)el('copy-status').textContent='Copied. Paste the reply into your chat.';
  }catch{
    if(id===copyId){el('copy-text').focus();el('copy-text').select();el('copy-status').textContent='Automatic copying is unavailable. Press Ctrl/Cmd+C to copy the selected text.'}
  }finally{if(id===copyId){copying=false;updateFooter()}}
}
el('scenario').addEventListener('change',()=>{
  saveSceneState();stopDemo();cancelPending();scenario=el('scenario').value;renderScene();invalidateContext();
  if(isOpen())showContext();announce(scenario==='exception'?'Limited access conversation selected.':'Normal conversation selected. Each scenario keeps its own messages and draft.');
});
contextInput.addEventListener('input',()=>{sourceKind='manual';scenes[scenario].context=contextInput.value;invalidateContext()});
intentInput.addEventListener('input',()=>{scenes[scenario].intent=intentInput.value;updateFooter()});
el('use-visible').addEventListener('click',()=>{contextInput.value=scenario==='exception'?cleanExceptionContext:sourceSnapshot();scenes[scenario].context=contextInput.value;sourceKind=scenario==='exception'?'sample':'visible';invalidateContext();contextInput.focus()});
el('use-manual').addEventListener('click',()=>{sourceKind='manual';updateContextNotice();contextInput.focus();contextInput.select()});
el('review-context').addEventListener('click',()=>showContext(true));
el('blocked-context').addEventListener('click',()=>showContext(true));
el('compare').addEventListener('click',()=>{comparing=!comparing;renderCandidates()});
el('candidate-list').addEventListener('click',event=>{const button=event.target.closest('.candidate');if(button)choose(Number(button.dataset.index),true)});
el('candidate-list').addEventListener('keydown',event=>{
  const delta={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1};
  if(event.key in delta){event.preventDefault();choose(current+delta[event.key],true)}
  if(event.key==='Home'||event.key==='End'){event.preventDefault();choose(event.key==='Home'?0:candidates.length-1,true)}
});
el('prev').addEventListener('click',()=>choose(current-1));el('next').addEventListener('click',()=>choose(current+1));
function applyTweak(style){
  if(!confirmedContext||!candidates.length)return;
  const base=buildCandidates(confirmedContext.text,confirmedContext.draft);if(!base)return;
  candidates[current]=style==='warm'?base[1]:style==='precise'?base[0]:base[0]+(/[\u3400-\u9fff]/.test(base[0])?' My calendar is finally being cooperative.':' My calendar is finally being cooperative.');
  el('tweak-error').hidden=true;renderCandidates();announce('Wording updated. Your reply remains above.');
}
function submitTweak(){
  const request=el('tweak-input').value.trim();if(!request)return;
  const style=/warm|友好|温暖/i.test(request)?'warm':/precise|concise|简洁|精准/i.test(request)?'precise':/humor|funny|幽默|有趣/i.test(request)?'humor':null;
  if(style){applyTweak(style);el('tweak-input').value=''}else{el('tweak-error').textContent='Try “warmer”, “more precise”, or “add humor”.';el('tweak-error').hidden=false}
}
document.querySelectorAll('[data-style]').forEach(button=>button.addEventListener('click',()=>applyTweak(button.dataset.style)));
el('tweak-back').addEventListener('click',()=>setView('replies','secondary-action'));
el('tweak-submit').addEventListener('click',submitTweak);
el('tweak-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();submitTweak()}});
primary.addEventListener('click',()=>{
  stopDemo();if(primary.disabled)return;
  if(view==='context')confirmContext();else if(view==='intent')finishIdea();else if(view==='replies'||view==='tweak')insertReply();else if(view==='blocked')copyReply();
});
secondary.addEventListener('click',()=>{
  stopDemo();if(view==='intent'){replyIntent=intentInput.value.trim();scenes[scenario].replyIntent=replyIntent;const snapshot=sourceSnapshot();if(snapshot!==sessionSource){sessionSource=snapshot;contextInput.value=snapshot;sourceKind='visible'}invalidateContext();showContext(true)}
  else if(view==='replies'){comparing=false;renderCandidates();setView('tweak','tweak-input')}else if(confirmedContext)setView('replies');
});
el('close').addEventListener('click',dismiss);
orb.addEventListener('pointerdown',event=>{touchReveal=event.pointerType!=='mouse'&&!expanded()});
orb.addEventListener('click',()=>{
  if(isOpen())return;
  if(touchReveal){touchReveal=false;suppressHover=false;expandLauncher('reply',true);announce('Tap the green dot for replies or the black circle to share your idea.');return}
  startReply();
});
idea.addEventListener('click',()=>showIdea());
// Fixed hit areas and a shared bridge preserve the original orb geometry.
chat.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||demoRunning)return;
  if(isOpen()){resetOrb();return}
  const rect=orb.getBoundingClientRect(),dx=event.clientX-rect.left-24,dy=event.clientY-rect.top-24,distance=Math.hypot(dx,dy),inBridge=Math.abs(dx)<=32&&dy>=-54&&dy<=32;
  if(suppressHover){if(distance>100&&!inBridge)suppressHover=false;else return}
  const proximity=Math.max(0,Math.min(1,(90-distance)/62));pointerNear=proximity>0;
  if(proximity){const pull=reducedMotion.matches?0:Math.min(4,distance*.08)*proximity;orbArt.style.setProperty('--orb-scale',(1+.15*proximity).toFixed(3));orbArt.style.setProperty('--orb-x',(distance?dx/distance*pull:0).toFixed(2)+'px');orbArt.style.setProperty('--orb-y',(distance?dy/distance*pull:0).toFixed(2)+'px')}else resetOrb();
  if(distance<=34||(expanded()&&inBridge))expandLauncher(dy< -15?'idea':'reply');else scheduleCollapse();
});
chat.addEventListener('pointerleave',()=>{if(!demoRunning){pointerNear=false;resetOrb();suppressHover=false;scheduleCollapse()}});
launcher.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')clearClose()});launcher.addEventListener('pointerleave',scheduleCollapse);
launcher.addEventListener('focusin',event=>{if(restoringFocus)return;expandLauncher(event.target===idea?'idea':'reply',event.target.matches(':focus-visible'));if(event.target===orb)orbArt.style.setProperty('--orb-scale','1.15')});
launcher.addEventListener('focusout',()=>queueMicrotask(()=>{if(!launcher.contains(document.activeElement))scheduleCollapse()}));
input.addEventListener('input',()=>{scenes[scenario].composer=input.value;send.disabled=!input.value.trim()});
send.addEventListener('click',()=>{
  const value=input.value.trim();if(!value)return;
  const scene=scenes[scenario];scene.messages.push({mine:true,text:value,time:'Now　✓✓'});scene.preview=value;const bubble=document.createElement('div');bubble.className='bubble mine';bubble.append(document.createTextNode(value));const time=document.createElement('small');time.textContent='Now　✓✓';bubble.appendChild(time);messages.appendChild(bubble);messages.scrollTop=messages.scrollHeight;el('side-preview').textContent=value;input.value='';scene.composer='';send.disabled=true;announce('Sent to the demo conversation.');
});
play.addEventListener('click',()=>{
  hide(false);startReply(play);demoRunning=true;play.disabled=true;play.textContent='Playing…';
  const step=(fn,delay)=>demoTimers.push(setTimeout(()=>{if(demoRunning)fn()},delay));
  step(()=>{if(view!=='context')return;if(scenario==='exception'||!contextInput.value.trim()){contextInput.value=scenario==='exception'?cleanExceptionContext:demoContext;scenes[scenario].context=contextInput.value;sourceKind='sample'}invalidateContext();if(!confirmContext()){stopDemo();announce('Demo paused. Please review the conversation.')}},1800);
  step(()=>{comparing=true;renderCandidates()},3100);step(()=>choose(1),4300);step(insertReply,5700);
  step(()=>{stopDemo();announce('Demo complete. Review the context or compare replies.')},6200);
});
document.addEventListener('pointerdown',event=>{
  if(demoRunning&&!play.contains(event.target)){stopDemo();announce('Demo paused. You are in control.')}
  if(!launcher.contains(event.target)&&!overlay.contains(event.target)){collapseLauncher();suppressHover=false}
},true);
document.addEventListener('keydown',event=>{
  if(demoRunning){stopDemo();announce('Demo paused. You are in control.')}
  if(event.key==='Escape'&&(isOpen()||expanded())){event.preventDefault();dismiss();return}
  if(event.target===orb&&event.key==='ArrowUp'&&!isOpen()){event.preventDefault();suppressHover=false;expandLauncher('idea',true);idea.focus();return}
  if(event.target===idea&&event.key==='ArrowDown'&&!isOpen()){event.preventDefault();orb.focus();return}
  if(isOpen()&&(event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();if(view==='context')confirmContext();else if(view==='intent')finishIdea()}
});
window.addEventListener('blur',()=>{collapseLauncher();suppressHover=false});
window.addEventListener('resize',()=>{resetOrb();if(expanded())placeTip()});reducedMotion.addEventListener('change',resetOrb);
renderScene();
updateFooter();

el('scenario').value=scenario;
