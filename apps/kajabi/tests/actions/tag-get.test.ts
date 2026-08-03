import { assertEquals } from "@std/assert";
import tagGet from "../../actions/tag-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await tagGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contact_tags/7");
});

Deno.test("tag-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await tagGet.execute({ id: "7", fields: "name" }, ctx);
  assertEquals(queryOf(calls[0])["fields[contact_tags]"], "name");
});

Deno.test("tag-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await tagGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/contact_tags/a%2Fb");
});
