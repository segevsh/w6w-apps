import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-accounts-list.ts";

const RESPONSE = { "success": true, "data": [{ "emailAccountId": 1 }], "total": 1 };

Deno.test("email-accounts-list: calls GET /api/client/v2/email-accounts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "searchText": "acme", "limit": 10, "page": 2 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/email-accounts");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "searchText": "acme",
    "limit": "10",
    "page": "2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("email-accounts-list: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
});

Deno.test("email-accounts-list: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "searchText": "acme", "limit": 10, "page": 2 }, ctx),
    Error,
    "insufficientCredits",
  );
});
