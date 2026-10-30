import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import offerGet from "../../actions/offer-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("offer-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await offerGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/offers/7");
});

test("offer-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await offerGet.execute({ id: "7", fields: "title" }, ctx);
  assertEquals(queryOf(calls[0])["fields[offers]"], "title");
});

test("offer-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await offerGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/offers/a%2Fb");
});

test("offer-get: forwards `include` for compound documents", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await offerGet.execute({ id: "7", include: "tags" }, ctx);
  assertEquals(queryOf(calls[0])["include"], "tags");
});
