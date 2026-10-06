import { assertEquals, assertRejects } from "@std/assert";
import webhookEventsList from "../../actions/webhook-events-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-events-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await webhookEventsList.execute(
    {
      "webhookId": "webhookId-v",
      "after": "after-v",
      "since": "since-v",
      "until": "until-v",
      "count": 5,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.linkupapi.com/v2/webhooks/webhookId-v/events?after=after-v&since=since-v&until=until-v&count=5",
  );
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-events-list: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await webhookEventsList.execute({ "webhookId": "webhookId-v" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/webhooks/webhookId-v/events");
  assertEquals(calls[0].body, null);
});

Deno.test("webhook-events-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await webhookEventsList.execute({ "webhookId": "webhookId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
