import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-get.ts";

/** Before purchase it is a quote; after purchase it carries the label. */
Deno.test("shipment-get: an unbought shipment reports bought false, with rates", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "shp_1", rates: [{ id: "r1", rate: "10.05" }, { id: "r2", rate: "9.99" }] },
  }]);
  const result = await action.execute!({ shipmentId: "shp_1" }, ctx) as {
    bought: boolean;
    rates: Array<{ id: string }>;
  };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/shipments/shp_1");
  assertEquals(result.bought, false);
  assertEquals(result.rates.map((r) => r.id), ["r2", "r1"]);
});

Deno.test("shipment-get: a bought shipment reports bought true, with the label", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      id: "shp_1",
      tracking_code: "1Z999",
      postage_label: { label_url: "https://ep/l.png" },
    },
  }]);
  const result = await action.execute!({ shipmentId: "shp_1" }, ctx) as {
    bought: boolean;
    labelUrl: string;
  };
  assertEquals(result.bought, true);
  assertEquals(result.labelUrl, "https://ep/l.png");
});

Deno.test("shipment-get: needs a shipment id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});

Deno.test("shipment-get: says the object means two different things", () => {
  assert(/Before purchase/.test(action.description!), action.description);
});
