import { normalizePassage, validateReview, createReview, formatReview, MAX_NOTE_LENGTH } from './review-data.js';

const attributes = { 'passage-id': 'passageId', 'source-text': 'sourceText', 'translated-text': 'translatedText', 'source-locale': 'sourceLocale', 'target-locale': 'targetLocale', revision: 'revision', 'page-reference': 'pageReference' };
const stylesheet = `
  :host { display:block; font:inherit; color:var(--tr-text,#d8d8bf); --_bg:var(--tr-surface,#293b3b); --_panel:var(--tr-panel,#314747); --_text:var(--tr-text,#d8d8bf); --_accent:var(--tr-accent,#c9b68d); --_on:var(--tr-on-accent,#263b3b); --_line:var(--tr-border,#95aaa2); --_focus:var(--tr-focus,#ebba88); --_error:var(--tr-error,#f2b0a0); }
  :host([theme=light]) { --_bg:var(--tr-surface,#e5dcc6); --_panel:var(--tr-panel,#d7d4ba); --_text:var(--tr-text,#293f3e); --_accent:var(--tr-accent,#46645b); --_on:var(--tr-on-accent,#f0e3c7); --_line:var(--tr-border,#61786e); --_focus:var(--tr-focus,#8a3d29); --_error:var(--tr-error,#8b3029); }
  @media(prefers-color-scheme:light) { :host(:not([theme])) { --_bg:var(--tr-surface,#e5dcc6); --_panel:var(--tr-panel,#d7d4ba); --_text:var(--tr-text,#293f3e); --_accent:var(--tr-accent,#46645b); --_on:var(--tr-on-accent,#f0e3c7); --_line:var(--tr-border,#61786e); --_focus:var(--tr-focus,#8a3d29); --_error:var(--tr-error,#8b3029); } }
  * { box-sizing:border-box; } [hidden] { display:none !important; }
  ::selection { background:var(--_accent); color:var(--_on); }
  section { color:var(--_text); background:var(--_bg); border:1px solid var(--_line); border-radius:1rem; padding:clamp(1rem,3vw,1.8rem); overflow-wrap:anywhere; box-shadow:0 12px 40px #172d2d18; }
  .eyebrow { text-transform:uppercase; letter-spacing:.14em; font-size:.72em; font-weight:700; margin:0 0 .8rem; color:var(--_accent); }
  :host([theme=light]) .eyebrow { color:var(--_text); }
  .state { display:inline-block; font-size:.75em; padding:.3em .7em; border:1px solid var(--_line); border-radius:2rem; margin-bottom:.5em; }
  h2 { font-size:1.35em; margin:0 0 .5em; } h3 { font-size:1em; margin:0 0 .5em; }
  p { line-height:1.55; } .muted { font-size:.9em; } .meta { margin:.75em 0; }
  .texts { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr)); gap:1rem; margin:1em 0; }
  .text { padding:1.2rem; background:var(--_panel); border-radius:.6rem; min-width:0; border-top:3px solid var(--_accent); }
  .text:last-child { border-top-color:var(--_line); }
  .text h3 { text-transform:uppercase; letter-spacing:.08em; font-size:.72em; margin-bottom:1em; }
  .passage { margin:0; white-space:pre-wrap; line-height:1.7; unicode-bidi:plaintext; font-family:var(--tr-reading-font,Georgia,serif); font-size:1.15em; }
  label { display:block; font-weight:600; margin:1.1em 0 .4em; }
  textarea { display:block; width:100%; min-height:7em; resize:vertical; font:inherit; line-height:1.5; padding:.75em; border:1px solid var(--_line); border-radius:.4rem; color:var(--_text); background:var(--_panel); }
  textarea[readonly] { min-height:15em; } button { font:inherit; font-weight:600; padding:.7em 1em; min-height:44px; border:1px solid var(--_line); border-radius:.5rem; cursor:pointer; color:var(--_text); background:var(--_panel); white-space:normal; }
  button.primary { background:var(--_accent); color:var(--_on); } button:disabled { cursor:wait; opacity:.7; }
  :is(button,textarea):focus-visible { outline:3px solid var(--_focus); outline-offset:3px; }
  .actions { display:flex; gap:.65em; flex-wrap:wrap; margin:1em 0; } .error { color:var(--_error); font-weight:600; } .error:empty { display:none; } [aria-invalid=true] { border:2px solid var(--_error); }
  .status { min-height:1.5em; } @media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto; } }
  .meter { font-size:.75em; text-align:end; margin:.4em 0; }
  .credit { font-size:.75em; margin-bottom:0; }
  @media(prefers-reduced-motion:no-preference) { button { transition:transform 120ms ease, box-shadow 120ms ease; } button:hover { transform:translateY(-1px); box-shadow:0 3px 0 #172d2d30; } button:active { transform:translateY(1px); box-shadow:none; } section:not([hidden]) { animation:reveal 180ms ease-out; } @keyframes reveal { from { transform:translateY(5px); opacity:.8; } to { transform:translateY(0); opacity:1; } } }
`;

function node(tag, props = {}, text) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

export class TranslationReviewElement extends HTMLElement {
  static get observedAttributes() { return Object.keys(attributes).concat('submit-label','heading','brand'); }
  constructor() {
    super();
    this._passage = normalizePassage();
    this._drafts = new Map();
    this._generation = 0;
    this._adapter = null;
    const root = this.attachShadow({ mode: 'open' });
    root.append(node('style', {}, stylesheet));
    this._launch = node('button', { type:'button', lang:'en', 'aria-expanded':'false', 'aria-controls':'review' }, 'Review translation');
    this._panel = node('section', { id:'review', lang:'en', hidden:'', 'aria-labelledby':'heading' });
    this._heading=node('h2', { id:'heading' }, 'Make the meaning clearer.');
    this._state=node('span',{class:'state'},'Local draft');
    this._panel.append(node('p',{class:'eyebrow'},'Translation review'), this._heading, this._state, node('p', { class:'muted' }, 'Suggest a change for human review. Nothing is published automatically. Avoid names, contact details, or other private information. Drafts stay in memory until this page is closed or reloaded.'));
    this._meta = node('p', { class:'meta' });
    const texts = node('div', { class:'texts' });
    this._source = node('p', { class:'passage', dir:'auto' });
    this._translation = node('p', { class:'passage', dir:'auto' });
    for (const [title, passage] of [['Original',this._source], ['Current translation',this._translation]]) {
      const box = node('div', { class:'text' }); box.append(node('h3', {}, title), passage); texts.append(box);
    }
    this._form = node('form', { novalidate:'' });
    this._configError = node('p', { class:'error', role:'alert' });
    this._hint = node('p', { id:'hint', class:'muted' }, `Enter suggested wording, a comment, or both. Maximum ${MAX_NOTE_LENGTH.toLocaleString()} characters per field.`);
    this._suggestion = node('textarea', { id:'suggestion', maxlength:String(MAX_NOTE_LENGTH), 'aria-describedby':'hint suggestion-error', dir:'auto' });
    this._comment = node('textarea', { id:'comment', maxlength:String(MAX_NOTE_LENGTH), 'aria-describedby':'hint comment-error', dir:'auto' });
    this._suggestionError = node('p', { id:'suggestion-error', class:'error', role:'alert' });
    this._commentError = node('p', { id:'comment-error', class:'error', role:'alert' });
    this._meter=node('p',{class:'meter'},'Suggested wording: 0 / 8,000 · Comment: 0 / 8,000');
    this._submit = node('button', { type:'submit', class:'primary' }, 'Prepare review');
    const close = node('button', { type:'button' }, 'Close review'); close.addEventListener('click', () => this.close());
    const actions = node('div', { class:'actions' }); actions.append(this._submit, close);
    this._form.append(this._configError, this._hint, node('label',{for:'suggestion'},'Suggested wording'), this._suggestion, this._suggestionError, node('label',{for:'comment'},'Comment'), this._comment, this._commentError, this._meter, actions);
    this._status = node('p', { class:'status', role:'status', 'aria-live':'polite' });
    this._exports = node('div', { hidden:'' });
    this._output = node('textarea', { id:'output', readonly:'', 'aria-describedby':'export-hint', dir:'auto' });
    const copy = node('button', { type:'button' }, 'Copy review'); copy.addEventListener('click', () => this._copy());
    const download = node('button', { type:'button' }, 'Download review (.txt)'); download.addEventListener('click', () => this._download());
    const exportActions = node('div',{class:'actions'}); exportActions.append(copy, download);
    this._exports.append(node('label',{for:'output'},'Prepared review'), node('p',{id:'export-hint',class:'muted'},'Copy or save this text and share it through a channel you choose. Preparing, copying, or downloading does not send it.'), this._output, exportActions);
    this._credit=node('p',{class:'credit',hidden:''});
    this._panel.append(this._meta, texts, this._form, this._status, this._exports, this._credit);
    root.append(this._launch, this._panel);
    this._launch.addEventListener('click', () => this.open({returnFocus:this._launch}));
    this._form.addEventListener('submit', event => { event.preventDefault(); this._prepare(); });
    for (const field of [this._suggestion,this._comment]) field.addEventListener('input', () => { this._saveDraft(); this._invalidate(); this._showErrors({}); this._updateMeter(); });
    this._panel.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); this.close(); } });
  }
  connectedCallback() {
    // Upgrade properties assigned before the custom element definition loaded.
    for (const key of ['passage','adapter']) if (Object.prototype.hasOwnProperty.call(this,key)) { const value=this[key]; delete this[key]; this[key]=value; }
    this._renderPassage();
  }
  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value) return;
    if (name === 'submit-label') this._submit.textContent = value || 'Prepare review';
    else if (name === 'heading') this._heading.textContent=value || 'Make the meaning clearer.';
    else if (name === 'brand') { this._credit.textContent=value || ''; this._credit.hidden=!value; }
    else this.passage = { ...this._passage, [attributes[name]]:value ?? '' };
  }
  get passage() { return this._passage; }
  set passage(value) {
    this._saveDraft(); this._passage=normalizePassage(value); this._invalidate(); this._showErrors({});
    const draft=this._drafts.get(this._key());
    this._suggestion.value=draft?.suggestion || ''; this._comment.value=draft?.comment || '';
    this._renderPassage(); this._updateMeter();
  }
  get adapter() { return this._adapter; }
  set adapter(value) { if (value !== null && typeof value !== 'function') throw new TypeError('adapter must be a function or null.'); this._adapter=value; }
  _key() { return JSON.stringify(this._passage); }
  _saveDraft() { if (this._suggestion && this._passage.passageId) this._drafts.set(this._key(), { suggestion:this._suggestion.value, comment:this._comment.value }); }
  _invalidate() { this._generation++; this._exports.hidden=true; this._output.value=''; this._status.textContent=''; this._submit.disabled=false; this._submit.textContent=this.getAttribute('submit-label') || 'Prepare review'; this._state.textContent='Local draft'; }
  _updateMeter() { this._meter.textContent=`Suggested wording: ${this._suggestion.value.length.toLocaleString()} / 8,000 · Comment: ${this._comment.value.length.toLocaleString()} / 8,000`; }
  _renderPassage() {
    this._source.textContent=this._passage.sourceText || 'Choose a passage to see the original.'; this._translation.textContent=this._passage.translatedText || 'The translation will appear here.';
    // Invalid language tags are never placed in lang attributes.
    for (const [element,locale] of [[this._source,this._passage.sourceLocale],[this._translation,this._passage.targetLocale]]) {
      element.removeAttribute('lang'); try { if (Intl.getCanonicalLocales(locale).length) element.lang=locale; } catch { /* plain text still works */ }
    }
    this._meta.textContent=`${this._passage.sourceLocale || '—'} → ${this._passage.targetLocale || '—'} · Passage: ${this._passage.passageId || '—'} · Revision: ${this._passage.revision || '—'}`;
  }
  open({ focus = true, returnFocus } = {}) { const active=this.getRootNode().activeElement || document.activeElement; this._returnFocus=returnFocus || (active !== this && active !== document.body ? active : this._launch); this._panel.hidden=false; this._launch.hidden=true; this._launch.setAttribute('aria-expanded','true'); if (focus) this._suggestion.focus(); }
  close() { this._saveDraft(); this._panel.hidden=true; this._launch.hidden=false; this._launch.setAttribute('aria-expanded','false'); const target=this._returnFocus; if (target && target !== this && target.isConnected && !target.hidden && typeof target.focus === 'function') target.focus(); else this._launch.focus(); }
  clearDrafts() { this._drafts.clear(); this._suggestion.value=''; this._comment.value=''; this._invalidate(); this._showErrors({}); this._updateMeter(); }
  _showErrors(errors) {
    this._configError.textContent=errors.configuration || '';
    for (const [name,field,error] of [['suggestion',this._suggestion,this._suggestionError],['comment',this._comment,this._commentError]]) {
      error.textContent=errors[name] || ''; field.setAttribute('aria-invalid',String(Boolean(errors[name])));
    }
  }
  async _prepare() {
    if (this._submit.disabled) return;
    const errors=validateReview(this._passage,this._suggestion.value,this._comment.value); this._showErrors(errors);
    if (Object.keys(errors).length) { this._state.textContent='Needs attention'; (errors.comment ? this._comment : this._suggestion).focus(); return; }
    const review=createReview(this._passage,this._suggestion.value,this._comment.value);
    const generation=++this._generation;
    this._output.value=formatReview(review); this._exports.hidden=false;
    this._state.textContent='Ready to share';
    this._status.textContent='Review prepared locally. Copy or download it below; nothing has been sent.';
    const event=new CustomEvent('review-submit',{detail:review,bubbles:true,composed:true,cancelable:true});
    if (!this.dispatchEvent(event) || !this._adapter || generation !== this._generation) return;
    this._submit.disabled=true;
    this._submit.textContent='Preparing…'; this._state.textContent='Preparing draft';
    try {
      const result=await this._adapter(review);
      if (generation === this._generation) { this._state.textContent='Ready to share'; this._status.textContent=result?.message || 'Adapter finished. Confirm the outcome in your chosen destination. Copy and download remain available.'; }
    } catch (error) {
      // Do not render arbitrary adapter errors (which may contain credentials or private URLs).
      if (generation === this._generation) { this._state.textContent='Use a fallback'; this._status.textContent='The adapter could not prepare this review. Copy or download it below. No delivery is confirmed.'; }
      this.dispatchEvent(new CustomEvent('review-error',{detail:{code:'adapter-failed'},bubbles:true,composed:true}));
    } finally { if (generation === this._generation) { this._submit.disabled=false; this._submit.textContent=this.getAttribute('submit-label') || 'Prepare review'; } }
  }
  async _copy() {
    const output=this._output.value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(output);
      if (output === this._output.value) this._status.textContent='Review copied. Nothing has been sent.';
    } catch {
      if (output === this._output.value) { this._output.focus(); this._output.select(); this._status.textContent='Automatic copying is unavailable. Use your device’s Copy command on the selected review text.'; }
    }
  }
  _download() {
    if (typeof Blob === 'undefined' || typeof URL.createObjectURL !== 'function' || !('download' in document.createElement('a'))) {
      this._output.focus(); this._output.select(); this._status.textContent='Downloading is unavailable. Copy the selected review text instead.'; return;
    }
    const url=URL.createObjectURL(new Blob([this._output.value],{type:'text/plain;charset=utf-8'}));
    const link=node('a',{href:url,download:'translation-review.txt'}); this.shadowRoot.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    this._status.textContent='Download requested. Check your browser downloads. Nothing has been sent.';
  }
}

if ('customElements' in window && 'attachShadow' in HTMLElement.prototype && !customElements.get('translation-review')) customElements.define('translation-review',TranslationReviewElement);
