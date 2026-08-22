import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-update.ts";

const display = {};

Deno.test("email-update: PATCHes only the schedule — the endpoint takes nothing else", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { scheduled_at: "2026-09-01T00:00:00Z" } }],
    {
      display,
    },
  );
  await action.execute!({ emailId: "re_1", scheduledAt: "in 1 hour" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.resend.com/emails/re_1");
  assertEquals(JSON.parse(calls[0].body!), { scheduled_at: "in 1 hour" });
});

Deno.test("email-update: both fields are required", async () => {
  const noId = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ scheduledAt: "in 1 hour" }, noId.ctx),
    Error,
    "`emailId`",
  );
  const noTime = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ emailId: "re_1" }, noTime.ctx),
    Error,
    "`scheduledAt`",
  );
  assertEquals(noId.calls.length + noTime.calls.length, 0);
});
