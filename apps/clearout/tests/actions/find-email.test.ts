import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/find-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("find-email: POSTs name/domain and maps the candidates", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        emails: [{ email_address: "tony@marvel.com", role: "no", business: "yes" }],
        first_name: "Tony",
        last_name: "Stark",
        full_name: "Tony Stark",
        domain: "marvel.com",
        confidence_score: 90,
        total: 1,
        company: { name: "Marvel" },
        found_on: "2026-10-06",
      },
    },
  }]);
  const out = await run(action, {
    name: "Tony Stark",
    domain: "marvel.com",
    timeout: 20000,
    queue: false,
  }, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_finder/instant");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Tony Stark",
    domain: "marvel.com",
    timeout: 20000,
    queue: false,
  });
  assertEquals(out.queued, false);
  assertEquals(out.confidenceScore, 90);
  assertEquals((out.emails as unknown[]).length, 1);
});

Deno.test("find-email: a 524 with a queue_id is returned as queued, not thrown", async () => {
  const { ctx, logs } = mockCtx([{
    status: 524,
    body: {
      status: "failed",
      error: { message: "timed out", additional_info: { queue_id: "Q9" } },
    },
  }]);
  const out = await run(action, { name: "A B", domain: "x.com" }, ctx);
  assertEquals(out, { queued: true, queueId: "Q9" });
  assertEquals(logs[0].level, "info");
});

Deno.test("find-email: a 524 without a queue_id, 402 and blank inputs throw", async () => {
  const noq = mockCtx([{
    status: 524,
    body: { status: "failed", error: { message: "timed out" } },
  }]);
  await assertRejects(
    () => run(action, { name: "A", domain: "x.com" }, noq.ctx),
    Error,
    "timed out",
  );
  const poor = mockCtx([{
    status: 402,
    body: { status: "failed", error: { code: 1002, message: "x" } },
  }]);
  await assertRejects(
    () => run(action, { name: "A", domain: "x.com" }, poor.ctx),
    Error,
    "credits",
  );
  await assertRejects(
    () => run(action, { name: "A", domain: " " }, mockCtx().ctx),
    Error,
    "required",
  );
});
