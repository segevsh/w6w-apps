import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-find-email-status.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-find-email-status: GETs queue_status?qid= and maps the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        emails: [{ email_address: "a@x.com" }],
        full_name: "A B",
        domain: "x.com",
        confidence_score: 80,
        total: 1,
      },
    },
  }]);
  const out = await run(action, { queueId: " Q9 " }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_finder/instant/queue_status?qid=Q9");
  assertEquals(out.fullName, "A B");
  assertEquals(out.confidenceScore, 80);
});

Deno.test("get-find-email-status: blank queue ID throws; vendor failure throws", async () => {
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "queueId is required");
  const bad = mockCtx([{ status: 400, body: { status: "failed", error: { message: "bad qid" } } }]);
  await assertRejects(() => run(action, { queueId: "x" }, bad.ctx), Error, "bad qid");
});
