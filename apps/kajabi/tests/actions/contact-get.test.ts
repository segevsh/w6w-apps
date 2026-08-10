import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await contactGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contacts/7");
});

Deno.test("contact-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await contactGet.execute({ id: "7", fields: "name" }, ctx);
  assertEquals(queryOf(calls[0])["fields[contacts]"], "name");
});

Deno.test("contact-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await contactGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/contacts/a%2Fb");
});

Deno.test("contact-get: forwards `include` for compound documents", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await contactGet.execute({ id: "7", include: "tags" }, ctx);
  assertEquals(queryOf(calls[0])["include"], "tags");
});
