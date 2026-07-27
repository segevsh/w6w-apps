import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get.ts";

Deno.test("form-get: GETs /forms/{id} and returns the form", async () => {
  const body = { id: "abc", title: "Survey", fields: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute({ formId: "abc" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/forms/abc");
  assertEquals(result, body);
});

Deno.test("form-get: url-encodes the form id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/forms/a%2Fb");
});
