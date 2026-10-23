import { formatReview } from './review-data.js';

export function createMailtoAdapter({ to, openDraft = url => { window.location.href = url; }, maxUrlLength = 1800 } = {}) {
  // One plain mailbox only: disallow header injection, URI parameters and address lists.
  if (typeof to !== 'string' || !/^[A-Z0-9.!$'*+_~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(to) || to.length > 254) {
    throw new TypeError('Configure one plain email address for the draft recipient.');
  }
  if (typeof openDraft !== 'function' || !Number.isFinite(maxUrlLength) || maxUrlLength < 1) throw new TypeError('Invalid mailto adapter options.');
  return review => {
    const subject = `Translation review: ${review.passage.passageId}`.replace(/[\r\n]/g, ' ');
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formatReview(review))}`;
    if (url.length > maxUrlLength) throw new Error('This review is too long for a reliable email draft. Copy or download it instead.');
    // Called synchronously from the explicit form submit gesture. No network or sending API.
    openDraft(url);
    return { message: 'Email draft requested. Check your email app and choose whether to send. If no draft opened, copy or download below.' };
  };
}
