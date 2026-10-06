import { assertEquals, assertRejects } from "@std/assert";
import logList from "../../actions/log-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("log-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await logList.execute(
    {
      "limit": 5,
      "offset": 5,
      "action": "action-v",
      "accountId": "accountId-v",
      "status": "error",
      "dateFrom": "dateFrom-v",
      "dateTo": "dateTo-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.linkupapi.com/v2/logs?limit=5&offset=5&action=action-v&account_id=accountId-v&status=error&date_from=dateFrom-v&date_to=dateTo-v",
  );
  assertEquals(calls[0].body, null);
});

Deno.test("log-list: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await logList.execute({} as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/logs");
  assertEquals(calls[0].body, null);
});

Deno.test("log-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await logList.execute({} as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
