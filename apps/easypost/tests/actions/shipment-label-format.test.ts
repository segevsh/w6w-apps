import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-label-format.ts";

const label = (formats: Record<string, string>) => ({
  status: 200,
  body: { id: "shp_1", postage_label: formats },
});

/** A thermal printer will not take the PNG a purchase returns. */
Deno.test("shipment-label-format: converts to ZPL and returns that URL", async () => {
  const { ctx, calls } = mockCtx([label({
    label_url: "https://ep/l.png",
    label_zpl_url: "https://ep/l.zpl",
  })]);
  const result = await action.execute!({ shipmentId: "shp_1", format: "ZPL" }, ctx) as {
    labelUrl: string;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.easypost.com/v2/shipments/shp_1/label");
  assertEquals(new URL(calls[0].url).searchParams.get("file_format"), "ZPL");
  assertEquals(result.labelUrl, "https://ep/l.zpl");
});

Deno.test("shipment-label-format: PDF resolves to the pdf URL", async () => {
  const { ctx } = mockCtx([label({
    label_url: "https://ep/l.png",
    label_pdf_url: "https://ep/l.pdf",
  })]);
  const result = await action.execute!({ shipmentId: "shp_1", format: "PDF" }, ctx) as {
    labelUrl: string;
  };
  assertEquals(result.labelUrl, "https://ep/l.pdf");
});

Deno.test("shipment-label-format: PNG falls back to the plain label url", async () => {
  const { ctx } = mockCtx([label({ label_url: "https://ep/l.png" })]);
  const result = await action.execute!({ shipmentId: "shp_1", format: "PNG" }, ctx) as {
    labelUrl: string;
  };
  assertEquals(result.labelUrl, "https://ep/l.png");
});

Deno.test("shipment-label-format: a lowercase format is normalised", async () => {
  const { ctx, calls } = mockCtx([label({ label_url: "x", label_zpl_url: "z" })]);
  await action.execute!({ shipmentId: "shp_1", format: "zpl" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("file_format"), "ZPL");
});

Deno.test("shipment-label-format: needs a shipment id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});

Deno.test("shipment-label-format: says why the PNG is not enough", () => {
  assert(/thermal printer/.test(action.description!), action.description);
});
