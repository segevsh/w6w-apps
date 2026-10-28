import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get.ts";

Deno.test("form-get: GET /v1/forms/{formId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { formId: "f1", info: { title: "t" } } }]);
  const result = await action.execute({ formId: "f1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/forms/f1");
  assertEquals(calls[0].body, null);
  assertEquals(result, { formId: "f1", info: { title: "t" } });
});

Deno.test("form-get: accepts a pasted editor URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "https://docs.google.com/forms/d/abc123/edit" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/forms/abc123");
});

Deno.test("form-get: is a read action", () => {
  assertEquals(action.type, "read");
});
