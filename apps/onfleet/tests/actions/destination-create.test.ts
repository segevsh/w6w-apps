import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/destination-create.ts";

const addr =
  '{"number":"543","street":"Howard St","city":"San Francisco","state":"CA","country":"USA"}';

test("destination-create: sends the parsed address", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "dst_1" } }]);
  await action.execute!({ address: addr, notes: "rooftop access" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/destinations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.address.city, "San Francisco");
  assertEquals(body.notes, "rooftop access");
});

test("destination-create: language becomes options.language", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "dst_1" } }]);
  await action.execute!({ address: addr, language: "fr" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).options, { language: "fr" });
});

test("destination-create: address is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "address");
  assertEquals(calls.length, 0);
});

test("destination-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
