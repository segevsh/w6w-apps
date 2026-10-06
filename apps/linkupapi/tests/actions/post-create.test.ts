import { assertEquals, assertRejects } from "@std/assert";
import postCreate from "../../actions/post-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-create: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await postCreate.execute(
    {
      "accountId": "accountId-v",
      "message": "message-v",
      "file": "file-v",
      "thumbnail": "thumbnail-v",
      "documentTitle": "documentTitle-v",
      "files": "a; b",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "create",
    "params": {
      "message": "message-v",
      "file": "file-v",
      "thumbnail": "thumbnail-v",
      "document_title": "documentTitle-v",
      "files": ["a", "b"],
    },
  });
});

Deno.test("post-create: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await postCreate.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "create",
    "params": {},
  });
});

Deno.test("post-create: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await postCreate.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
