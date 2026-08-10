import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await customerGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/customers/7");
});

Deno.test("customer-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await customerGet.execute({ id: "7", fields: "name" }, ctx);
  assertEquals(queryOf(calls[0])["fields[customers]"], "name");
});

Deno.test("customer-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await customerGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/customers/a%2Fb");
});
