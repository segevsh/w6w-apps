import { assertEquals } from "@std/assert";
import formGet from "../../actions/form-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await formGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/forms/7");
});

Deno.test("form-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await formGet.execute({ id: "7", fields: "title" }, ctx);
  assertEquals(queryOf(calls[0])["fields[forms]"], "title");
});

Deno.test("form-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await formGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/forms/a%2Fb");
});
