import { assertEquals, assertRejects } from "@std/assert";
import emailFind from "../../actions/email-find.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("email-find: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await emailFind.execute(
    {
      "firstName": "firstName-v",
      "lastName": "lastName-v",
      "companyDomain": "companyDomain-v",
      "companyName": "companyName-v",
      "profileUrl": "profileUrl-v",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/enrich");
  assertEquals(JSON.parse(calls[0].body!), {
    "action": "find_email",
    "params": {
      "first_name": "firstName-v",
      "last_name": "lastName-v",
      "company_domain": "companyDomain-v",
      "company_name": "companyName-v",
      "profile_url": "profileUrl-v",
    },
  });
});

Deno.test("email-find: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await emailFind.execute({} as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/enrich");
  assertEquals(JSON.parse(calls[0].body!), { "action": "find_email", "params": {} });
});

Deno.test("email-find: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await emailFind.execute({} as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
