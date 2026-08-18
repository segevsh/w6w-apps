import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-buy.ts";

const shipment = (rates: unknown[]) => ({ status: 200, body: { id: "shp_1", rates } });
const bought = {
  status: 200,
  body: {
    id: "shp_1",
    tracking_code: "1Z999",
    postage_label: {
      label_url: "https://ep/label.png",
      label_pdf_url: "https://ep/label.pdf",
      label_zpl_url: "https://ep/label.zpl",
    },
    selected_rate: { carrier: "USPS", rate: "9.99" },
  },
};

Deno.test("shipment-buy: buys a named rate and returns every label format", async () => {
  const { ctx, calls } = mockCtx([bought]);
  const result = await action.execute!({ shipmentId: "shp_1", rateId: "rate_1" }, ctx) as {
    labelUrl: string;
    labelZplUrl: string;
    tracking_code: string;
  };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/shipments/shp_1/buy");
  assertEquals(JSON.parse(calls[0].body!), { rate: { id: "rate_1" } });
  assertEquals(result.tracking_code, "1Z999");
  assertEquals(result.labelUrl, "https://ep/label.png");
  assertEquals(result.labelZplUrl, "https://ep/label.zpl");
});

/** Picking the cheapest by hand from an array is where the string-sort bug lives. */
Deno.test("shipment-buy: buying the cheapest re-reads and compares numerically", async () => {
  const { ctx, calls } = mockCtx([
    shipment([{ id: "r1", rate: "10.05" }, { id: "r2", rate: "9.99" }]),
    bought,
  ]);
  await action.execute!({ shipmentId: "shp_1", buyCheapest: true }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(JSON.parse(calls[1].body!), { rate: { id: "r2" } });
});

/** The guard worth setting on anything that buys automatically. */
Deno.test("shipment-buy: a rate above the ceiling is refused before any purchase", async () => {
  const { ctx, calls } = mockCtx([
    shipment([{ id: "r1", rate: "45.00", carrier: "FedEx", service: "Priority" }]),
  ]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "shp_1", maxPrice: 20 }, ctx),
    Error,
    "refusing to buy",
  );
  // Only the read happened; nothing was bought.
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
});

Deno.test("shipment-buy: a rate within the ceiling proceeds", async () => {
  const { ctx, calls } = mockCtx([shipment([{ id: "r1", rate: "9.99" }]), bought]);
  await action.execute!({ shipmentId: "shp_1", maxPrice: 20 }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(JSON.parse(calls[1].body!).rate, { id: "r1" });
});

Deno.test("shipment-buy: a rate id not on the shipment is refused by name", async () => {
  const { ctx } = mockCtx([shipment([{ id: "r1", rate: "9.99" }])]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "shp_1", rateId: "r_gone", maxPrice: 50 }, ctx),
    Error,
    "not on this shipment",
  );
});

Deno.test("shipment-buy: a shipment with no rates is refused", async () => {
  const { ctx } = mockCtx([shipment([])]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "shp_1", buyCheapest: true }, ctx),
    Error,
    "no rates",
  );
});

/** Insurance is cheaper as part of the purchase, and impossible afterwards. */
Deno.test("shipment-buy: an insurance amount reaches the wire as a string", async () => {
  const { ctx, calls } = mockCtx([bought]);
  await action.execute!({ shipmentId: "shp_1", rateId: "r1", insuranceAmount: 249.99 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).insurance, "249.99");
});

Deno.test("shipment-buy: zero insurance is omitted rather than sent", async () => {
  const { ctx, calls } = mockCtx([bought]);
  await action.execute!({ shipmentId: "shp_1", rateId: "r1", insuranceAmount: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).insurance, undefined);
});

/**
 * Logged before the request: if it dies mid-flight, this line is the only
 * record that money may have moved.
 */
Deno.test("shipment-buy: logs the intent before buying and the outcome after", async () => {
  const { ctx, logs } = mockCtx([bought]);
  await action.execute!({ shipmentId: "shp_1", rateId: "rate_1" }, ctx);
  assertEquals(logs[0].data, { shipmentId: "shp_1", rateId: "rate_1" });
  assertEquals(logs[1].data, { shipmentId: "shp_1", carrier: "USPS", price: "9.99" });
});

Deno.test("shipment-buy: needs a shipment id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});

/** A refund is a request to the carrier, not an undo. */
Deno.test("shipment-buy: says plainly that it spends money", () => {
  assert(/PURCHASES the label/.test(action.description!), action.description);
});
