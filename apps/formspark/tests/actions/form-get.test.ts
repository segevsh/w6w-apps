import { assertEquals } from "@std/assert";
import formGet from "../../actions/form-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-get: GET /forms/{id}", async () => {
  const form = { id: "f1", name: "Contact", spamProtection: null };
  const { ctx, calls } = mockCtx([{ body: form }]);
  const out = await formGet.execute({ formId: "f1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1");
  assertEquals(out, form);
});

Deno.test("form-get: a path-breaking id is encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formGet.execute({ formId: "a/b?c" }, ctx);
  assertEquals(calls[0].url, "https://api.formspark.io/public/v1/forms/a%2Fb%3Fc");
});
