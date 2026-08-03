import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-edit.ts";

Deno.test("submission-edit: POSTs to /submission/{id} with submission[...] fields", async () => {
  const { ctx, calls, logs } = mockCtx([
    {
      body: envelope({
        submissionID: "237955080346633702",
        URL: "http://api.jotform.com/submission/237955080346633702",
      }),
    },
  ]);
  const result = await action.execute({
    submissionId: "237955080346633702",
    answers: { "1_first": "Johny", new: "1", flag: "0" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/submission/237955080346633702");

  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("submission[1_first]"), "Johny");
  assertEquals(body.get("submission[new]"), "1");
  assertEquals(body.get("submission[flag]"), "0");

  assertEquals((result as { submissionID: string }).submissionID, "237955080346633702");
  assertEquals(logs[0].level, "info");
});

Deno.test("submission-edit: a field-set update is idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
