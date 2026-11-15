const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export function html(strings, ...values) {
  const markup = strings.reduce(
    (out, chunk, index) => out + chunk + (index < values.length ? toHtml(values[index]) : ""),
    ""
  );
  return new SafeHtml(markup);
}

function toHtml(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toHtml).join("");
  if (value === null || value === undefined || value === false) return "";
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}
