import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-create.ts";

const rated = (rates: unknown[]) => ({ status: 200, body: { id: "shp_1", rates } });
const addr = '{"street1":"179 N Harbor Dr","city":"Redondo Beach","state":"CA","zip":"90277"}';
const parcel = '{"length":10,"width":8,"height":4,"weight":16}';

Deno.test("shipment-create: wraps the body and sends both addresses and the parcel", async () => {
  const { ctx, calls } = mockCtx([rated([])]);
  await action.execute!({ toAddress: addr, fromAddress: "adr_home", parcel }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/shipments");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.shipment.to_address.zip, "90277");
  // An address given as a bare id becomes a reference rather than failing to parse.
  assertEquals(body.shipment.from_address, { id: "adr_home" });
  assertEquals(body.shipment.parcel.weight, 16);
});

/**
 * `rate` is a string, so comparing lexically puts "9.99" above "10.05" — which
 * buys the wrong label and is never noticed.
 */
Deno.test("shipment-create: sorts rates numerically and surfaces the cheapest", async () => {
  const { ctx } = mockCtx([rated([
    { id: "r1", rate: "10.05", carrier: "UPS" },
    { id: "r2", rate: "9.99", carrier: "USPS" },
    { id: "r3", rate: "100.00", carrier: "FedEx" },
  ])]);
  const result = await action.execute!({ toAddress: addr, fromAddress: addr, parcel }, ctx) as {
    rates: Array<{ id: string }>;
    cheapestRate: { id: string };
    rateCount: number;
  };
  assertEquals(result.rates.map((r) => r.id), ["r2", "r1", "r3"]);
  assertEquals(result.cheapestRate.id, "r2");
  assertEquals(result.rateCount, 3);
});

/** No rates is a real outcome — no carrier account can serve the route. */
Deno.test("shipment-create: an empty rate list is warned about", async () => {
  const { ctx, logs } = mockCtx([rated([])]);
  await action.execute!({ toAddress: addr, fromAddress: addr, parcel }, ctx);
  assert(logs.some((l) => l.level === "warn" && /no rates/.test(l.message)), JSON.stringify(logs));
});

/**
 * EasyPost's one-call buy purchases immediately when `service` is included in
 * creation. A step named "create shipment" must not spend money.
 */
Deno.test("shipment-create: offers no service parameter, so it cannot buy by accident", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("service"), keys.join(","));
  assert(/BUYS NOTHING/.test(action.description!), action.description);
});

Deno.test("shipment-create: carrier accounts become id references", async () => {
  const { ctx, calls } = mockCtx([rated([])]);
  await action.execute!({
    toAddress: addr,
    fromAddress: addr,
    parcel,
    carrierAccounts: "ca_1, ca_2",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).shipment.carrier_accounts, [
    { id: "ca_1" },
    { id: "ca_2" },
  ]);
});

Deno.test("shipment-create: all three of address, address and parcel are required", async () => {
  for (const missing of ["toAddress", "fromAddress", "parcel"]) {
    const input: Record<string, unknown> = { toAddress: addr, fromAddress: addr, parcel };
    input[missing] = "";
    const { ctx, calls } = mockCtx([], {});
    await assertRejects(async () => await action.execute!(input, ctx), Error, missing);
    assertEquals(calls.length, 0);
  }
});

Deno.test("shipment-create: logs the shipment and rate count, not the addresses", async () => {
  const { ctx, logs } = mockCtx([rated([{ id: "r1", rate: "9.99" }])]);
  await action.execute!({ toAddress: addr, fromAddress: addr, parcel }, ctx);
  assert(!JSON.stringify(logs).includes("Redondo"), JSON.stringify(logs));
  assertEquals(logs[0].data, { shipmentId: "shp_1", rateCount: 1 });
});
