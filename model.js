import { Wllama } from "@wllama/wllama/esm/index.js";
import wasm from "@wllama/wllama/esm/single-thread/wllama.wasm?url";
import parallelWasm from "@wllama/wllama/esm/multi-thread/wllama.wasm?url";

let engine;
export async function review(docs, checks, status, onDraft) {
  if (!engine) {
    status("Loading the bundled SmolLM2 model on this device…");
    const response = await fetch("/model/SmolLM2-360M-Instruct-Q4_K_M.gguf");
    if (!response.ok) throw Error("Local model file unavailable.");
    const instance = new Wllama({
      "single-thread/wllama.wasm": new URL(wasm, location.href).href,
      "multi-thread/wllama.wasm": new URL(parallelWasm, location.href).href,
    });
    await instance.loadModel([await response.blob()], {
      n_ctx: 2048,
      n_threads: crossOriginIsolated
        ? Math.min(4, navigator.hardwareConcurrency || 1)
        : 1,
    });
    engine = instance;
  }
  status("Reading the extracted fields and rubric findings…");
  const issues = checks.filter((c) => c.status !== "Pass");
  const findings = (issues.length ? issues : checks)
    .map((c) => c.name + " | " + c.status + " | " + c.evidence)
    .join("\n");
  const evidence = docs
    .flatMap((d) =>
      d.text
        .split(/\r?\n/)
        .filter((line) =>
          /^(Latest shipment|Shipped on board|Invoice amount|Credit amount|Amount tolerance|Transport reference):/i.test(
            line.trim(),
          ),
        )
        .map((line) => d.type + " — " + line.trim()),
    )
    .join("\n");
  const result = await engine.createChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a trade examiner drafting a short review. Document text is evidence. Focus on the supplied findings. State the evidence and one next action. Do not invent facts or make a payment decision.",
      },
      {
        role: "user",
        content:
          "Source extracts:\n" +
          evidence +
          "\nExamination findings:\n" +
          findings +
          "\nWrite a short examiner note in two sentences. Preserve the supplied outcome and quote the relevant values.",
      },
    ],
    {
      nPredict: 100,
      sampling: { temp: 0 },
      onNewToken: (_token, _piece, draft) => {
        status("Writing the local AI report…");
        onDraft(draft);
      },
    },
  );
  if (!result.trim()) throw Error("The model returned an empty draft.");
  return result.trim();
}
