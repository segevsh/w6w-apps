import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-get.ts";

test("response-get: GET /v1/forms/{formId}/responses/{responseId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseId: "r1", formId: "f1" } }]);
  const result = await action.execute({ formId: "f1", responseId: "r1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/forms/f1/responses/r1");
  assertEquals(result, { responseId: "r1", formId: "f1" });
});

test("response-get: percent-encodes an awkward response id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", responseId: "a/b" }, ctx);
  assertEquals(calls[0].url.endsWith("/responses/a%2Fb"), true);
});
