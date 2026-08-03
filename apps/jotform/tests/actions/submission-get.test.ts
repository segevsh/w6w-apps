import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-get.ts";

Deno.test("submission-get: GETs /submission/{submissionID}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "237955080346633702",
        form_id: "31751954731962",
        answers: { "4": { text: "Your Message", answer: "hi" } },
      }),
    },
  ]);
  const result = await action.execute({ submissionId: "237955080346633702" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/submission/237955080346633702");
  assertEquals((result as { id: string }).id, "237955080346633702");
});
