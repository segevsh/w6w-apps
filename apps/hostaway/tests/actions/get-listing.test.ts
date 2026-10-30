import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-listing.ts";

test("get-listing: GETs /v1/listings/{id} and unwraps the listing object", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 40160, name: "Cozy apartment" })]);
  const listing = await action.execute({ listingId: 40160 }, ctx) as { name: string };
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/listings/40160");
  assertEquals(calls[0].method, "GET");
  assertEquals(listing.name, "Cozy apartment");
});

test("get-listing: includeResources is passed as an integer flag only when set", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1 })]);
  await action.execute({ listingId: 1, includeResources: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeResources"), "1");
});

test("get-listing: refuses a call without a listing id, making no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "listingId");
  assertEquals(calls.length, 0);
});
