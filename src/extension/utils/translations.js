export function localizeHtmlPage() {
  const html = document.getElementsByTagName("html")[0];
  let valStrH = html.innerHTML.toString();
  let valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
    return v1 ? chrome.i18n.getMessage(v1) : "";
  });

  if (valNewH != valStrH) {
    html.innerHTML = valNewH;
  }
}
