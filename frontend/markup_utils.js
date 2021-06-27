export function insertHTML(selector, html) {
  var targetElem = document.querySelector(selector);
  targetElem.innerHTML = html;
}