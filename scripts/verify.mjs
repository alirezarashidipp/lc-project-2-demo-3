import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { cases } from "../cases.js";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || undefined,
  args: ["--disable-gpu"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("Browser:", e.message));
  await page.goto(process.env.APP_URL || "http://127.0.0.1:5177");
  for (const [i, c] of cases.entries()) {
    await page
      .getByRole("button", { name: "Examination workspace", exact: true })
      .click();
    await page.locator("#enable").uncheck();
    await page
      .locator("#pick")
      .setInputFiles("public/samples/" + c[0] + "/package.zip");
    await page.locator(".report").waitFor({ timeout: 90000 });
    const title = await page.locator(".report h2").innerText();
    console.log(
      c[0],
      title,
      await page.locator(".check span").allTextContents(),
    );
    assert.equal(
      title,
      [
        "Selected checks passed",
        "Potential discrepancy",
        "Further evidence required",
      ][i],
    );
    assert.ok(
      await page
        .locator(".report")
        .getByText("Packing list.pdf · OCR", { exact: true })
        .count(),
    );
  }
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#add").click();
  await (
    await chooser
  ).setFiles("public/samples/LC-26043/Replacement bill.pdf");
  await page.getByRole("heading", { name: "Selected checks passed" }).waitFor();
  console.log("Corrected evidence cleared the unresolved check.");
} finally {
  await browser.close();
}
