import { assertEquals, assertRejects } from "@std/assert";
import postCreateCompany from "../../actions/post-create-company.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-create-company: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await postCreateCompany.execute(
    {
      "accountId": "accountId-v",
      "companyUrl": "companyUrl-v",
      "message": "message-v",
      "file": "file-v",
      "thumbnail": "thumbnail-v",
      "files": "a; b",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "create_company",
    "params": {
      "company_url": "companyUrl-v",
      "message": "message-v",
      "file": "file-v",
      "thumbnail": "thumbnail-v",
      "files": ["a", "b"],
    },
  });
});

Deno.test("post-create-company: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await postCreateCompany.execute(
    { "accountId": "accountId-v", "companyUrl": "companyUrl-v" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "create_company",
    "params": { "company_url": "companyUrl-v" },
  });
});

Deno.test("post-create-company: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await postCreateCompany.execute(
        { "accountId": "accountId-v", "companyUrl": "companyUrl-v" } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
