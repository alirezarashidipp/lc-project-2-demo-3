import { jsPDF } from "jspdf";
import { zipSync } from "fflate";
import { writeFileSync, mkdirSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { cases, types } from "../cases.js";
for (const [id, goods, from, to, seller, buyer, amount, total, date] of cases) {
  const dir = "public/samples/" + id;
  mkdirSync(dir, { recursive: true });
  const ref = "BL-" + id.slice(3);
  const data = [
    [
      "Applicant: " + buyer,
      "Beneficiary: " + seller,
      "Goods: " + goods,
      "Credit currency: USD",
      "Credit amount: " + amount,
      "Amount tolerance: 5%",
      "Latest shipment: 15 Jun 2026",
      "Documents required: invoice, bill of lading, packing list, certificate of origin",
    ],
    [
      "Carrier: Meridian Ocean Lines",
      "Vessel: MV Meridian Sky",
      "Port of loading: " + from,
      "Port of discharge: " + to,
      "Transport reference: " + ref,
      "Issue date: 14 Jun 2026",
      "Shipped on board: " + date,
    ],
    [
      "Seller: " + seller,
      "Buyer: " + buyer,
      "Goods: " + goods,
      "Invoice currency: USD",
      "Invoice amount: " + total,
      "Invoice number: INV-" + id.slice(3),
    ],
    [
      "Goods: " + goods,
      "Packages: 24",
      "Transport reference: " + ref,
      "Port of loading: " + from,
    ],
    [
      "Exporter: " + seller,
      "Goods: " + goods,
      "Origin: " +
        { Rotterdam: "Netherlands", Hamburg: "Germany", Mumbai: "India" }[from],
    ],
  ];
  const zip = {};
  function pdf(i, rows) {
    const doc = new jsPDF();
    const lines = [types[i], "Credit reference: " + id, ...rows];
    if (i === 3) {
      const canvas = createCanvas(1100, 1500),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 1100, 1500);
      ctx.fillStyle = "#182633";
      ctx.font = "32px Arial";
      lines.forEach((s, n) => ctx.fillText(s, 70, 150 + n * 68));
      ctx.font = "20px Arial";
      ctx.fillText("Synthetic trade document", 70, 1380);
      doc.addImage(canvas.toBuffer("image/png"), "PNG", 0, 0, 210, 290);
    } else {
      doc.setFillColor(14, 38, 48);
      doc.rect(0, 0, 210, 35, "F");
      doc.setTextColor(255);
      doc.setFontSize(20);
      doc.text(types[i], 18, 22);
      doc.setTextColor(28, 44, 50);
      doc.setFontSize(11);
      lines
        .slice(1)
        .forEach((s, n) => doc.text(s, 18, 55 + n * 13, { maxWidth: 175 }));
      doc.setFontSize(9);
      doc.text("Synthetic trade document   /   Examination workspace", 18, 280);
    }
    return new Uint8Array(doc.output("arraybuffer"));
  }
  types.forEach((s, i) => {
    const filename = s + ".pdf";
    zip[filename] = pdf(i, data[i]);
    writeFileSync(dir + "/" + filename, zip[filename]);
  });
  writeFileSync(dir + "/package.zip", zipSync(zip));
  if (date === "[illegible]")
    writeFileSync(
      dir + "/Replacement bill.pdf",
      pdf(1, [...data[1].slice(0, -1), "Shipped on board: 14 Jun 2026"]),
    );
}
