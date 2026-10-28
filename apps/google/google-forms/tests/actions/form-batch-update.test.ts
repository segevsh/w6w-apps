import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-batch-update.ts";

Deno.test("form-batch-update: POSTs the raw requests array verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  const requests = [
    { createItem: { item: { title: "Q1" }, location: { index: 0 } } },
    { deleteItem: { location: { index: 4 } } },
  ];
  await action.execute({ formId: "f1", requests }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/forms/f1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), { requests });
});

Deno.test("form-batch-update: targetRevisionId wins over requiredRevisionId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    formId: "f1",
    requests: [{ moveItem: {} }],
    includeFormInResponse: true,
    targetRevisionId: "t1",
    requiredRevisionId: "r1",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includeFormInResponse, true);
  assertEquals(body.writeControl, { targetRevisionId: "t1" });
});

Deno.test("form-batch-update: rejects an empty request array without calling the API", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ formId: "f1", requests: [] }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});
