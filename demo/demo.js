import '../src/translation-review.js';

const samples = [
  { title:'A warmer welcome', passageId:'welcome.intro', sourceText:'A place to find your people, share what you know, and feel at home.', translatedText:'Un lugar para encontrar a tu gente, compartir lo que sabes y sentirte como en casa.', sourceLocale:'en', targetLocale:'es', revision:'demo-2026-10-23.1' },
  { title:'Make room for a question', passageId:'support.questions', sourceText:'You do not need to have every answer before asking for help.', translatedText:'No necesitas tener todas las respuestas antes de pedir ayuda.', sourceLocale:'en', targetLocale:'es', revision:'demo-2026-10-23.1' },
  { title:'An invitation to connect', passageId:'community.invitation', sourceText:'Bring your curiosity. There is room for your story here.', translatedText:'Apportez votre curiosité. Votre histoire a sa place ici.', sourceLocale:'en', targetLocale:'fr', revision:'demo-2026-10-23.1' }
];
const reviewer=document.querySelector('#reviewer');
if ('customElements' in window && customElements.get('translation-review')) {
  for (const [index, sample] of samples.entries()) {
    const button=document.createElement('button'); button.type='button'; button.className='passage-choice'; button.setAttribute('aria-pressed',String(index===0));
    for (const [tag,text,cls] of [['small',`0${index+1} / ${sample.sourceLocale.toUpperCase()} → ${sample.targetLocale.toUpperCase()}`],['strong',sample.title],['span',sample.sourceText,'excerpt']]) {
      const child=document.createElement(tag); child.textContent=text; if (cls) child.className=cls; button.append(child);
    }
    button.addEventListener('click',()=>{
      for (const item of document.querySelectorAll('.passage-choice')) item.setAttribute('aria-pressed',String(item===button));
      reviewer.passage=sample; reviewer.open({returnFocus:button});
      document.querySelector('#activity').textContent='Local mode · no destination configured';
    });
    document.querySelector('#passages').append(button);
  }
  reviewer.passage=samples[0]; reviewer.open({focus:false});
  reviewer.addEventListener('review-submit',()=>{document.querySelector('#activity').textContent='Review prepared locally · copy or download to share';});
}
document.querySelector('#theme').addEventListener('click',event=>{
  const light=document.documentElement.dataset.theme!=='light';
  document.documentElement.dataset.theme=light?'light':'dark'; reviewer.setAttribute('theme',light?'light':'dark');
  event.currentTarget.textContent=light?'Dark theme':'Light theme'; event.currentTarget.setAttribute('aria-pressed',String(light));
});
