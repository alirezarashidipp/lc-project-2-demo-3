import { types } from "./cases.js";
export function classify(text) {
  return types.find((t) =>
    text
      .toLowerCase()
      .split(/\r?\n/)
      .some((line) => line.trim().toLowerCase() === t.toLowerCase()),
  );
}
export function field(text, key) {
  return (
    (text || "")
      .split(/\r?\n/)
      .map((x) => x.trim())
      .find((x) => x.toLowerCase().startsWith(key.toLowerCase() + ":"))
      ?.split(":")
      .slice(1)
      .join(":")
      .trim() || ""
  );
}
function dateValue(s) {
  if (!/^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(s)) return NaN;
  const value = Date.parse(s + " 00:00:00 GMT");
  return new Date(value).getUTCDate() === Number(s.split(" ")[0]) ? value : NaN;
}
export function examine(docs) {
  const byType = (t) => docs.filter((d) => d.type === t);
  const read = (i, k) => {
    const found = byType(types[i]);
    return found.length === 1 ? field(found[0].text, k) : "";
  };
  const checks = [];
  function check(name, basis, ready, passed, evidence) {
    checks.push({
      name,
      basis,
      status: ready ? (passed ? "Pass" : "Flagged") : "Unresolved",
      evidence,
    });
  }
  const all = types.every((t) => byType(t).length === 1) && docs.length === 5;
  check(
    "Document package",
    "Credit document schedule",
    all,
    all,
    types.map((t) => t + " × " + byType(t).length).join(" · "),
  );
  const refs = docs.map((d) => field(d.text, "Credit reference"));
  check(
    "Credit reference",
    "Cross-document consistency · UCP 600 art. 14(d)",
    all && refs.every(Boolean),
    new Set(refs).size === 1,
    refs.map((r) => r || "Unreadable").join(" / "),
  );
  const latest = read(0, "Latest shipment"),
    onBoard = read(1, "Shipped on board");
  const days = (dateValue(onBoard) - dateValue(latest)) / 86400000;
  check(
    "Shipment timing",
    "UCP 600 art. 20(a)(ii) · ISBP 821 E6",
    Number.isFinite(days),
    days <= 0,
    "LC latest shipment: " +
      (latest || "Missing") +
      " · B/L on-board notation: " +
      (onBoard || "Missing") +
      (days > 0 ? " · " + days + " days late" : ""),
  );
  const amt = read(0, "Credit amount"),
    inv = read(2, "Invoice amount"),
    tol = read(0, "Amount tolerance"),
    currency = read(0, "Credit currency"),
    ic = read(2, "Invoice currency");
  const nums =
    [amt, inv].every((x) => /^\d+(\.\d{1,2})?$/.test(x)) &&
    /^\d+(\.\d+)?%$/.test(tol);
  check(
    "Invoice value and currency",
    "Explicit credit amount tolerance · UCP 600 art. 18(a)(iii)",
    nums && currency && ic,
    ic === currency && Math.abs(+inv - amt) <= (+amt * parseFloat(tol)) / 100,
    "Credit: " +
      currency +
      " " +
      amt +
      " ± " +
      (tol || "?") +
      " · Invoice: " +
      ic +
      " " +
      inv,
  );
  const bl = read(1, "Transport reference"),
    pack = read(3, "Transport reference");
  check(
    "Transport references",
    "Cross-document consistency · UCP 600 art. 14(d)",
    bl && pack,
    bl === pack,
    "Bill of lading: " +
      (bl || "Missing") +
      " · Packing list: " +
      (pack || "Missing"),
  );
  return checks;
}
export function deadline(date) {
  const d = new Date(date);
  let count = 0;
  while (count < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return d;
}
