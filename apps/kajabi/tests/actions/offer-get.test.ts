import { assertEquals } from "@std/assert";
import offerGet from "../../actions/offer-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("offer-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await offerGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/offers/7");
});

Deno.test("offer-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await offerGet.execute({ id: "7", fields: "title" }, ctx);
  assertEquals(queryOf(calls[0])["fields[offers]"], "title");
});

Deno.test("offer-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await offerGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/offers/a%2Fb");
});

Deno.test("offer-get: forwards `include` for compound documents", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await offerGet.execute({ id: "7", include: "tags" }, ctx);
  assertEquals(queryOf(calls[0])["include"], "tags");
});
