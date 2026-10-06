import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/work-email-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("work-email-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "email_queue_count": 0 } }]);
  const out = await action.execute!({
    "profileUrl": "https://www.linkedin.com/in/williamhgates",
    "callbackUrl": "https://hooks.example.com/x",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/profile/email");
  assertEquals(Object.fromEntries(url.searchParams), {
    "profile_url": "https://www.linkedin.com/in/williamhgates",
    "callback_url": "https://hooks.example.com/x",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "emailQueueCount": 0, "result": { "email_queue_count": 0 } });
});

Deno.test("work-email-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("work-email-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "profileUrl": "https://www.linkedin.com/in/williamhgates",
        "callbackUrl": "https://hooks.example.com/x",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
