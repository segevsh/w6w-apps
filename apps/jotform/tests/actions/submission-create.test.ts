import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-create.ts";

Deno.test("submission-create: POSTs form-encoded submission[...] fields", async () => {
  const { ctx, calls, logs } = mockCtx([
    {
      body: envelope({
        submissionID: "SUBMISSION ID",
        URL: "http://api.jotform.com/submission/SUBMISSION ID",
      }, { "limit-left": 9966 }),
    },
  ]);
  const result = await action.execute({
    formId: "31751954731962",
    answers: { "1": "answer of Question 1", "2_first": "First Name", "2_last": "Last Name" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/form/31751954731962/submissions");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("submission[1]"), "answer of Question 1");
  assertEquals(body.get("submission[2_first]"), "First Name");
  assertEquals(body.get("submission[2_last]"), "Last Name");

  assertEquals((result as { submissionID: string }).submissionID, "SUBMISSION ID");
  assertEquals(logs[0].level, "info");
});

Deno.test("submission-create: is not idempotent — each POST mints a new submission", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("submission-create: rejects a nested-object answer before calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ formId: "1", answers: { "2": { first: "x" } } }, ctx),
    Error,
    "nested object",
  );
  assertEquals(calls.length, 0);
});
