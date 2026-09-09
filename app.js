const views=[...document.querySelectorAll('.view')];
const tabs=[...document.querySelectorAll('.tab')];
const networkStatus=document.getElementById('networkStatus');

function openView(id){
  views.forEach(view=>view.classList.toggle('active',view.id===id));
  tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

tabs.forEach(tab=>tab.addEventListener('click',()=>openView(tab.dataset.view)));
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>openView(button.dataset.open)));

function updateNetwork(){
  const online=navigator.onLine;
  networkStatus.textContent=online?'ONLINE':'OFFLINE';
  networkStatus.style.background=online?'#dcfce7':'#fee2e2';
}
addEventListener('online',updateNetwork);addEventListener('offline',updateNetwork);updateNetwork();

function programmeCard(programme,learning=false){
  const progress=programme.pilotProgress;
  return `<article class="programme-card">
    <p class="eyebrow">${programme.category.toUpperCase()} • ${programme.status.toUpperCase()}</p>
    <h3>${programme.name}</h3>
    <p class="programme-meta">${programme.qualificationId} • ${programme.schemaVersion}</p>
    ${progress?`<p><strong>${progress.moduleId} Lesson 3</strong> • ${progress.scoreText}</p>`:''}
    <p class="helper">${learning?'This is the current controlled LMS pilot record.':'Learning remains inside the specialist PWA.'}</p>
    <a class="programme-link" href="${programme.pwaUrl}" target="_blank" rel="noopener noreferrer">Open ${programme.name}</a>
  </article>`;
}

async function loadProgrammes(){
  const learning=document.getElementById('learningCards');
  const programmes=document.getElementById('programmeCards');
  try{
    const response=await fetch('./programmes.json');
    const data=await response.json();
    learning.innerHTML=data.map(item=>programmeCard(item,true)).join('');
    programmes.innerHTML=data.map(item=>programmeCard(item,false)).join('');
  }catch(error){
    const fallback='<article class="programme-card"><h3>Mzansi Boilermaker</h3><p>Programme registry unavailable. The offline shell is still active.</p></article>';
    learning.innerHTML=fallback;programmes.innerHTML=fallback;
  }
}

if('serviceWorker'in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));}
loadProgrammes();
