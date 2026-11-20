import { cases, types } from "./cases.js";
import { examine, deadline, field } from "./examination.js";
import { unzipSync } from "fflate";
const content = document.querySelector("#content"),
  pick = document.querySelector("#pick");
let page = "workspace",
  docs = [],
  checks = [],
  receipt,
  reading = false,
  message = "",
  ai = "",
  aiState = "",
  generation = 0,
  aiBusy = false,
  useAI = true,
  replace = false;
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (n) =>
  '<span aria-hidden="true" class="icon" style="--icon:url(/icons/' +
  n +
  '.svg)"></span>';
const date = (d) =>
  d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const heading = (i, title, sub) =>
  '<div class="inline head"><span class="tile">' +
  icon(i) +
  "</span><div><h3>" +
  title +
  "</h3><p>" +
  sub +
  "</p></div></div>";
const zipped = (c) => "/samples/" + c[0] + "/package.zip";
const samples = () =>
  cases
    .map(
      (c) =>
        '<div class="sample"><span class="fileIcon">' +
        icon("folder-open") +
        '</span><div><div class="mono">' +
        c[0] +
        "</div><strong>" +
        c[1] +
        "</strong><p>" +
        c[2] +
        " → " +
        c[3] +
        '</p></div><a download="' +
        c[0] +
        '.zip" aria-label="Download ' +
        c[1] +
        ' package" href="' +
        zipped(c) +
        '">' +
        icon("download") +
        "</a></div>",
    )
    .join("");
function pipeline() {
  const steps = [
    ["files", "Documents received", "Manual package upload"],
    ["scan-line", "Evidence extracted", "PDF text and scanned-page OCR"],
    [
      "list-checks",
      "Rules executed",
      "Credit conditions and examination rubric",
    ],
    ["file-text", "Report prepared", "Findings and examiner handoff"],
  ];
  return steps
    .map(
      ([i, t, p], n) =>
        '<div class="step ' +
        (docs.length && !reading
          ? "done"
          : reading && n === 1
            ? "current"
            : "") +
        '"><i>' +
        icon(i) +
        "</i><div><strong>" +
        t +
        "</strong><p>" +
        p +
        "</p></div></div>",
    )
    .join("");
}
function workspace() {
  return (
    '<div class="titleline"><h2>Processing workspace</h2><span class="tag"><b class="dot"></b>' +
    (reading
      ? "Processing"
      : docs.length
        ? "Run complete"
        : "Ready for intake") +
    '</span></div><div class="grid"><div><section class="card">' +
    heading(
      "upload-cloud",
      "Document intake",
      "Upload a presentation to start an automated processing run.",
    ) +
    '<div class="drop" id="drop">' +
    icon("upload-cloud") +
    '<h3>Drop your document package here</h3><p class="help">Multiple PDFs or one sample ZIP package</p><button class="btn primary" id="choose" ' +
    (reading ? "disabled" : "") +
    ">" +
    icon("folder-open") +
    ' Browse files</button></div><div class="hint">' +
    icon("lock-keyhole") +
    ' Documents are processed on this device.</div><label class="hint"><input id="enable" type="checkbox" ' +
    (useAI ? "checked" : "") +
    '> Generate local LLM review · bundled model runs on this device</label><div id="progress" role="status" class="progress">' +
    esc(message) +
    "</div>" +
    (docs.length
      ? '<button class="textbtn" data-go="report">Open current examination report →</button>'
      : "") +
    '</section><section class="card"><div class="sectiontop"><h3>Sample packages</h3><button class="textbtn" data-go="library">Case library ↗</button></div>' +
    samples() +
    '</section></div><aside class="card">' +
    heading("activity", "Processing sequence", "Automated examination run") +
    pipeline() +
    "</aside></div>"
  );
}
function library() {
  return (
    '<div class="titleline"><h2>Case library</h2><span class="tag">3 presentations</span></div><div class="library">' +
    cases
      .map(
        (c) =>
          '<article class="card"><div class="eyebrow">' +
          c[0] +
          '</div><span class="tile">' +
          icon("ship") +
          "</span><h3>" +
          c[1] +
          "</h3><p>" +
          c[2] +
          " → " +
          c[3] +
          '</p><p class="help">' +
          c[4] +
          " · " +
          c[5] +
          '</p><p class="hint">Scenario · ' +
          c[9] +
          "</p><details><summary>5 source documents</summary>" +
          types
            .map(
              (t) =>
                '<a download href="/samples/' +
                c[0] +
                "/" +
                t +
                '.pdf">' +
                t +
                " ↗</a>",
            )
            .join("") +
          '</details><a class="btn" download="' +
          c[0] +
          '.zip" href="' +
          zipped(c) +
          '">' +
          icon("download") +
          " Download package</a>" +
          (c === cases[2]
            ? '<a download href="/samples/' +
              c[0] +
              '/Replacement bill.pdf">Download legible replacement</a>'
            : "") +
          "</article>",
      )
      .join("") +
    "</div>"
  );
}
function report() {
  const flagged = checks.filter((c) => c.status === "Flagged"),
    missing = checks.filter((c) => c.status === "Unresolved");
  const outcome = flagged.length
    ? "Potential discrepancy"
    : missing.length
      ? "Further evidence required"
      : "Selected checks passed";
  const ref =
    field(docs.find((d) => d.type === types[0])?.text, "Credit reference") ||
    "Unidentified credit";
  const lines = checks
    .map(
      (c) =>
        '<div class="check"><span class="' +
        c.status +
        '">' +
        c.status +
        "</span><strong>" +
        c.name +
        '</strong><p class="help">' +
        c.basis +
        "</p><p>" +
        esc(c.evidence) +
        "</p></div>",
    )
    .join("");
  return (
    '<div class="titleline"><h2>Examination report</h2><div class="actions"><button class="btn" id="add">' +
    icon("upload-cloud") +
    ' Add or replace evidence</button><button class="btn primary" id="print">' +
    icon("printer") +
    ' Print / Save PDF</button></div></div><article class="report"><div class="eyebrow">DOCUMENTARY CREDIT EXAMINATION &nbsp; / &nbsp; ' +
    esc(ref) +
    "</div><h2>" +
    outcome +
    "</h2><p>" +
    docs.length +
    " documents received · " +
    date(receipt) +
    " · " +
    checks.filter((c) => c.status === "Pass").length +
    " of " +
    checks.length +
    " checks passed</p>" +
    '<div class="metrics">' +
    [
      [0, "Latest shipment", "Credit deadline"],
      [1, "Shipped on board", "On-board notation"],
      [2, "Invoice amount", "Invoice value"],
    ]
      .map(([index, key, label]) => {
        const source = docs.find((d) => d.type === types[index]);
        const value = field(source?.text, key);
        const currency =
          index === 2 ? field(source?.text, "Invoice currency") + " " : "";
        return (
          "<div><small>" +
          label +
          "</small><strong>" +
          esc(value ? currency + value : "Unavailable") +
          "</strong><small>" +
          types[index] +
          "</small></div>"
        );
      })
      .join("") +
    "</div><h3>Examination rubric</h3>" +
    lines +
    "<h3>Examiner workflow</h3><p>Local case " +
    esc(ref) +
    " · " +
    (flagged.length || missing.length
      ? "Assigned to authorised examiner queue (demo)"
      : "Ready for examiner sign-off") +
    "</p><p>Examination due by close of " +
    date(deadline(receipt)) +
    ". Demo calendar counts Monday–Friday following presentation and assumes no bank holidays. UCP 600 art. 14(b).</p>" +
    (flagged.length
      ? "<h3>Draft discrepancy notice</h3><p>For examiner review · Presentation " +
        esc(ref) +
        ". Potential discrepancies identified:</p>" +
        flagged
          .map((c) => "<p>" + esc(c.name) + " — " + esc(c.evidence) + "</p>")
          .join("")
      : "") +
    (missing.length
      ? "<h3>Evidence request</h3><p>Provide readable supporting documents for " +
        missing.map((c) => c.name).join(", ") +
        ". Re-run the examination using Add or replace evidence.</p>"
      : "") +
    '<h3>Local AI review</h3><p id="aiStatus" class="help" role="status">' +
    esc(aiState) +
    '</p><p class="aiText">' +
    esc(ai) +
    "</p>" +
    (!ai && !aiBusy
      ? '<button id="review" class="btn noPrint">Generate local AI report</button>'
      : "") +
    "<h3>Source evidence</h3>" +
    docs
      .map(
        (d) =>
          "<details><summary>" +
          esc(d.name) +
          " · " +
          esc(d.method) +
          "</summary><pre>" +
          esc(d.text || d.error) +
          "</pre></details>",
      )
      .join("") +
    '<p class="hint">Selected provisions · <a href="https://library.iccwbo.org/content/tfb/RULES/tfb-ucp600-rules.htm">UCP 600</a> · <a href="https://library.iccwbo.org/content/tfb/RULES/tfb-isbp-2023-06.htm">ISBP 821 E6</a></p></article>'
  );
}
function show(next = page) {
  page = next;
  document.querySelector(".hero").hidden = page === "report";
  document.querySelector(".hero").style.display =
    page === "report" ? "none" : "";
  document.querySelectorAll("nav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.page === page);
    b.disabled = b.dataset.page === "report" && (!docs.length || reading);
  });
  content.innerHTML =
    page === "workspace"
      ? workspace()
      : page === "library"
        ? library()
        : report();
}
function status(s) {
  message = s;
  const el = document.querySelector("#progress");
  if (el) el.textContent = s;
}
async function runAI() {
  if (aiBusy) return;
  const token = generation;
  aiBusy = true;
  document.querySelector("#review")?.remove();
  const update = (s) => {
    if (token !== generation) return;
    aiState = s;
    const node = document.querySelector("#aiStatus");
    if (node) node.textContent = s;
  };
  update("Starting local model…");
  try {
    const { review } = await import("./model.js");
    const result = await review(docs, checks, update, (draft) => {
      if (token !== generation) return;
      ai = draft;
      const node = document.querySelector(".aiText");
      if (node) node.textContent = draft;
    });
    if (token === generation) {
      ai = result;
      update("Generated locally · SmolLM2 360M · Draft for examiner review");
    }
  } catch (e) {
    if (token === generation) ai = "";
    update("AI review unavailable. " + e.message);
  } finally {
    aiBusy = false;
    if (page === "report") show();
    if (token !== generation && useAI && !reading && docs.length) runAI();
  }
}
async function intake(input, append = false) {
  if (reading || !input.length) return;
  reading = true;
  show("workspace");
  try {
    const files = [];
    for (const f of input) {
      if (/\.zip$/i.test(f.name)) {
        const entries = unzipSync(new Uint8Array(await f.arrayBuffer()), {
          filter: (e) => /\.pdf$/i.test(e.name),
        });
        for (const [name, bytes] of Object.entries(entries))
          files.push(new File([bytes], name.split("/").pop()));
      } else if (/\.pdf$/i.test(f.name)) files.push(f);
    }
    if (!files.length) throw Error("Choose a PDF or a ZIP containing PDFs.");
    const started = new Date(),
      { readPackage } = await import("./read.js"),
      newDocs = await readPackage(files, status);
    if (append) {
      const replaced = new Set(newDocs.map((d) => d.type).filter(Boolean));
      docs = [
        ...docs.filter(
          (d) =>
            !replaced.has(d.type) && !newDocs.some((n) => n.name === d.name),
        ),
        ...newDocs,
      ];
    } else {
      docs = newDocs;
      receipt = started;
    }
    checks = examine(docs);
    generation++;
    ai = "";
    aiState = useAI
      ? "Local model requested."
      : "Local model disabled for this run.";
    message = "Examination complete.";
    reading = false;
    show("report");
    window.scrollTo(0, 0);
    if (useAI) runAI();
  } catch (e) {
    reading = false;
    message = "Package could not be processed. " + e.message;
    show("workspace");
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.page || b.dataset.go) show(b.dataset.page || b.dataset.go);
  if (b.id === "choose" || b.id === "add") {
    replace = b.id === "add";
    pick.click();
  }
  if (b.id === "print") window.print();
  if (b.id === "review") runAI();
});
pick.onchange = () => {
  intake([...pick.files], replace);
  pick.value = "";
};
document.addEventListener("change", (e) => {
  if (e.target.id === "enable") useAI = e.target.checked;
});
for (const name of ["dragover", "dragleave", "drop"])
  document.addEventListener(name, (e) => {
    const drop = e.target.closest("#drop");
    if (!drop) return;
    e.preventDefault();
    drop.classList.toggle("over", name === "dragover");
    if (name === "drop") intake([...e.dataTransfer.files]);
  });
show();
