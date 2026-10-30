import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import addressGet from "../../actions/address-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("address-get: GETs the resource by id, path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "adr_abc", object: "x" } }]);
  const out = await addressGet.execute({ addressId: " adr_abc " }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/addresses/adr_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "adr_abc");
});

test("address-get: a slash in the id cannot change the route", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addressGet.execute({ addressId: "adr_a/../b" }, ctx);
  assert(!pathOf(calls[0].url).includes("/../"));
});

test("address-get: a 404 reports Lob's not_found code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "not found", 404) }]);
  await assertRejects(
    async () => await addressGet.execute({ addressId: "adr_zzz" }, ctx),
    Error,
    "not_found",
  );
});
