let natsumiAudio=null;
let natsumiBgmTimer=null;
let natsumiBgmOn=false;

function natsumiAudioCtx(){
  if(!natsumiAudio) natsumiAudio=new (window.AudioContext||window.webkitAudioContext)();
  return natsumiAudio;
}

function natsumiBeep(freq=440,duration=.12,type='sine',gain=.03){
  const ctx=natsumiAudioCtx();
  const osc=ctx.createOscillator();
  const vol=ctx.createGain();
  osc.type=type;
  osc.frequency.value=freq;
  vol.gain.value=gain;
  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start();
  vol.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
  osc.stop(ctx.currentTime+duration);
}

function toggleNatsumiBgm(){
  const btn=document.querySelector('#bgmBtn');
  if(natsumiBgmOn){
    clearInterval(natsumiBgmTimer);
    natsumiBgmTimer=null;
    natsumiBgmOn=false;
    if(btn) btn.textContent='🎵 BGM 켜기';
    return;
  }
  natsumiAudioCtx().resume();
  natsumiBgmOn=true;
  if(btn) btn.textContent='🔇 BGM 끄기';
  const melody=[392,440,523,440,392,330,392,494];
  let i=0;
  natsumiBgmTimer=setInterval(()=>{
    natsumiBeep(melody[i%melody.length],.18,'triangle',.018);
    i++;
  },360);
}

async function applySupportRequest(){
  const userId=(window.state?.me?.id)||document.querySelector('#userId')?.value?.trim()||'demo-user';
  const name=document.querySelector('#supportName')?.value?.trim();
  const amount=Number(document.querySelector('#supportAmount')?.value||0);
  const memo=document.querySelector('#supportMemo')?.value?.trim();
  const result=document.querySelector('#supportResult');
  if(!name||amount<=0){alert('입금자명/닉네임과 후원 금액을 입력해줘.');return;}
  const payload={userId,name,amount,memo,createdAt:new Date().toISOString()};
  try{
    if(window.state?.config?.apiBase){
      const res=await fetch(`${window.state.config.apiBase}/api/support/apply`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error('request failed');
      if(result) result.textContent='후원 인증 신청 완료! 운영자가 확인 후 후원자 전용 프로필을 지급할 거야.';
      return;
    }
  }catch(e){}
  const rows=JSON.parse(localStorage.getItem('natsumi-support-requests')||'[]');
  rows.push(payload);
  localStorage.setItem('natsumi-support-requests',JSON.stringify(rows));
  if(result) result.textContent='데모 모드로 후원 인증 신청을 저장했어. 실제 운영에서는 VPS 백엔드가 저장해.';
}

window.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('#bgmBtn')?.addEventListener('click',toggleNatsumiBgm);
  document.querySelector('#supportApplyBtn')?.addEventListener('click',applySupportRequest);
});
