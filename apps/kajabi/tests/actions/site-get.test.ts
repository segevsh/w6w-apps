import { assertEquals } from "@std/assert";
import siteGet from "../../actions/site-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("site-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await siteGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/sites/7");
});

Deno.test("site-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await siteGet.execute({ id: "7", fields: "title" }, ctx);
  assertEquals(queryOf(calls[0])["fields[sites]"], "title");
});

Deno.test("site-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await siteGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/sites/a%2Fb");
});
