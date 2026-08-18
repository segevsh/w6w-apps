import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/address-create.ts";

const created = { status: 200, body: { id: "adr_1" } };

Deno.test("address-create: posts a wrapped address without verifying", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ street1: "417 Montgomery St", city: "San Francisco" }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/addresses");
  assertEquals(JSON.parse(calls[0].body!).address.street1, "417 Montgomery St");
});

/** Carriers surcharge residential delivery whether or not you declare it. */
Deno.test("address-create: residential is sent only when set", async () => {
  const off = mockCtx([created]);
  await action.execute!({ street1: "1 Main St" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).address.residential, undefined);

  const on = mockCtx([created]);
  await action.execute!({ street1: "1 Main St", residential: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).address.residential, true);

  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "residential")!;
  assert(/invoice adjustment/.test(p.hint!), p.hint);
});

Deno.test("address-create: logs the id, never the address", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute!({ street1: "417 Montgomery St", name: "Ada" }, ctx);
  assert(!JSON.stringify(logs).includes("Montgomery"), JSON.stringify(logs));
  assertEquals(logs[0].data, { addressId: "adr_1" });
});

Deno.test("address-create: needs a street", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "street1");
  assertEquals(calls.length, 0);
});

/** A customer's address came from a form and should be verified instead. */
Deno.test("address-create: points a customer address at the verify action", () => {
  assert(/address-verify/.test(action.description!), action.description);
});
