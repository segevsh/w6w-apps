import { assertEquals, assertRejects } from "@std/assert";
import companySearch from "../../actions/company-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-search: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await companySearch.execute(
    {
      "accountId": "accountId-v",
      "keyword": "keyword-v",
      "location": "a; b",
      "sector": "a; b",
      "companySize": "a; b",
      "offset": 5,
      "count": 5,
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "search_companies",
    "params": {
      "keyword": "keyword-v",
      "location": ["a", "b"],
      "sector": ["a", "b"],
      "company_size": ["a", "b"],
      "offset": 5,
      "count": 5,
    },
  });
});

Deno.test("company-search: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await companySearch.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "search_companies",
    "params": {},
  });
});

Deno.test("company-search: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await companySearch.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
