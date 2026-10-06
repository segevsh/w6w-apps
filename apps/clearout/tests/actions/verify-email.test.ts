import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/verify-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("verify-email: POSTs the email and maps the vendor fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        email_address: "valid@example.com",
        status: "valid",
        safe_to_send: "yes",
        sub_status: { code: 200, desc: "Success" },
        detail_info: { domain: "example.com" },
        disposable: "no",
        free: "no",
        role: "no",
        gibberish: "no",
        suggested_email_address: "",
        bounce_type: "",
        verified_on: "2026-10-06",
        time_taken: 120,
      },
    },
  }]);
  const out = await run(action, { email: " valid@example.com ", timeout: 5000 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_verify/instant");
  assertEquals(JSON.parse(calls[0].body!), { email: "valid@example.com", timeout: 5000 });
  assertEquals(out.status, "valid");
  assertEquals(out.safeToSend, "yes");
  assertEquals(out.subStatus, { code: 200, desc: "Success" });
  assertEquals(out.timeTaken, 120);
});

Deno.test("verify-email: omits timeout when unset; blank email throws before a request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: {} } }]);
  await run(action, { email: "a@b.co" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co" });
  const none = mockCtx();
  await assertRejects(() => run(action, { email: " " }, none.ctx), Error, "email is required");
  assertEquals(none.calls.length, 0);
});

Deno.test("verify-email: 402, 429 and a 200 failed envelope throw with the vendor message", async () => {
  const poor = mockCtx([{
    status: 402,
    body: { status: "failed", error: { code: 1002, message: "exhausted" } },
  }]);
  await assertRejects(() => run(action, { email: "a@b.co" }, poor.ctx), Error, "credits");
  const busy = mockCtx([{
    status: 429,
    body: { status: "failed", error: { code: 1030, message: "limit" } },
  }]);
  await assertRejects(() => run(action, { email: "a@b.co" }, busy.ctx), Error, "rate limit");
  const soft = mockCtx([{
    status: 200,
    body: { status: "failed", error: { code: 1027, message: "Email address not found" } },
  }]);
  await assertRejects(() => run(action, { email: "a@b.co" }, soft.ctx), Error, "not found");
});
