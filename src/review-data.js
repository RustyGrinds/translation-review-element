export const MAX_NOTE_LENGTH = 8000;
const fields = ['passageId', 'sourceText', 'translatedText', 'sourceLocale', 'targetLocale', 'revision', 'pageReference'];

// Page references deliberately retain only scheme, host and path. Never infer location.href.
export function safePageReference(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    return ['https:', 'http:'].includes(url.protocol) ? `${url.origin}${url.pathname}` : '';
  } catch { return ''; }
}

export function normalizePassage(value = {}) {
  const result = {};
  for (const key of fields) result[key] = String(value?.[key] ?? '');
  result.pageReference = safePageReference(result.pageReference);
  return Object.freeze(result);
}

function isLocale(value) {
  if (!value || value.length > 100) return false;
  try {
    if (typeof Intl !== 'undefined' && Intl.getCanonicalLocales) return Intl.getCanonicalLocales(value).length === 1;
    return /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(value);
  } catch { return false; }
}

export function validateReview(passage, suggestion, comment) {
  const errors = {};
  for (const key of ['passageId', 'revision']) {
    if (!passage[key].trim() || passage[key].length > 200) errors.configuration = 'A passage ID and revision of 1–200 characters are required.';
  }
  if (!passage.sourceText.trim() || !passage.translatedText.trim() || passage.sourceText.length > 50000 || passage.translatedText.length > 50000) {
    errors.configuration = 'Source and translated text are required (up to 50,000 characters each).';
  }
  if (!isLocale(passage.sourceLocale) || !isLocale(passage.targetLocale)) errors.configuration = 'Valid source and target language tags are required, such as en and es-MX.';
  if (!suggestion.trim() && !comment.trim()) errors.suggestion = 'Add suggested wording or a comment before preparing a review.';
  if (suggestion.length > MAX_NOTE_LENGTH) errors.suggestion = `Keep suggested wording within ${MAX_NOTE_LENGTH} characters.`;
  if (comment.length > MAX_NOTE_LENGTH) errors.comment = `Keep the comment within ${MAX_NOTE_LENGTH} characters.`;
  return errors;
}

export function createReview(passage, suggestion, comment) {
  const normalized = normalizePassage(passage);
  const errors = validateReview(normalized, suggestion, comment);
  if (Object.keys(errors).length) throw new TypeError(Object.values(errors).join(' '));
  return Object.freeze({ schemaVersion: 1, passage: normalized, suggestion: suggestion.trim(), comment: comment.trim() });
}

export function formatReview(review) {
  const p = review.passage;
  return [
    'Translation review — suggestion only; human approval required',
    `Passage ID: ${p.passageId}`, `Revision: ${p.revision}`,
    `Languages: ${p.sourceLocale} → ${p.targetLocale}`,
    ...(p.pageReference ? [`Page: ${p.pageReference}`] : []),
    '', 'ORIGINAL', p.sourceText, '', 'CURRENT TRANSLATION', p.translatedText,
    '', 'SUGGESTED WORDING', review.suggestion || '(none)', '', 'COMMENT', review.comment || '(none)'
  ].join('\n');
}
