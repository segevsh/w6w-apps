import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/presentation-batch-update.ts";

Deno.test("presentation-batch-update: POSTs the raw requests array verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { presentationId: "p1", replies: [{}, {}] } }]);
  const requests = [
    { createSlide: { insertionIndex: 0 } },
    { deleteObject: { objectId: "g1" } },
  ];
  await action.execute({ presentationId: "p1", requests }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), { requests });
});

Deno.test("presentation-batch-update: attaches Slides' single writeControl arm", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    presentationId: "p1",
    requests: [{ createSlide: {} }],
    requiredRevisionId: "rev-7",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).writeControl, { requiredRevisionId: "rev-7" });
});

Deno.test("presentation-batch-update: rejects an empty request array without calling the API", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ presentationId: "p1", requests: [] }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});
