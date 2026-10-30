import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import addressGet from "../../actions/address-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("address-get: hits GET /addresses/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("address", { id: 7, city: "Boston" }) },
  ]);
  const out = await addressGet.execute({ addressId: "7" }, ctx);
  assertEquals(pathOf(calls[0].url), "/addresses/7");
  assertEquals(out, { id: 7, city: "Boston" });
});
