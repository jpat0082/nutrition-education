import DOMPurify from 'dompurify'
export function sanitize(text) {
  // As we do not use v-html, this is extra safety; still sanitize any user strings displayed.
  return DOMPurify.sanitize(String(text))
}
