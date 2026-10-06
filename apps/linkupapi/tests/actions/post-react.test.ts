import { assertEquals, assertRejects } from "@std/assert";
import postReact from "../../actions/post-react.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-react: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await postReact.execute(
    {
      "accountId": "accountId-v",
      "postUrl": "postUrl-v",
      "reactionType": "INSIGHTFUL",
      "companyUrl": "companyUrl-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "react",
    "params": {
      "post_url": "postUrl-v",
      "reaction_type": "INSIGHTFUL",
      "company_url": "companyUrl-v",
    },
  });
});

Deno.test("post-react: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await postReact.execute({ "accountId": "accountId-v", "postUrl": "postUrl-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "react",
    "params": { "post_url": "postUrl-v" },
  });
});

Deno.test("post-react: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await postReact.execute({ "accountId": "accountId-v", "postUrl": "postUrl-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
