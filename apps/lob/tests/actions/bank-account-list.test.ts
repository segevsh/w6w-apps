import { assert, assertEquals, assertRejects } from "@std/assert";
import bankAccountList from "../../actions/bank-account-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("bank-account-list: GETs /bank_accounts and flattens the page", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "list",
      data: [{ id: "x_1" }],
      count: 1,
      next_url: "https://api.lob.com/v1/bank_accounts?limit=1&after=CURSOR1",
      previous_url: null,
    },
  }]);
  const out = await bankAccountList.execute({ limit: 1 }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/bank_accounts");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(out.items, [{ id: "x_1" }]);
  assertEquals(out.count, 1);
  assertEquals(out.nextCursor, "CURSOR1");
  assertEquals(out.previousCursor, null);
  assertEquals("totalCount" in out, false);
});

Deno.test("bank-account-list: cursor, total count and filters are serialized in Lob's bracket form", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], count: 0, total_count: 7 } }]);
  const out = await bankAccountList.execute({
    after: "ABC",
    includeTotal: true,
    dateCreated: { gt: "2026-01-01" },
    metadata: '{"campaign":"c1"}',
  }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("after"), "ABC");
  assertEquals(url.searchParams.getAll("include[]"), ["total_count"]);
  assertEquals(url.searchParams.get("date_created[gt]"), "2026-01-01");
  assertEquals(url.searchParams.get("metadata[campaign]"), "c1");
  assertEquals(out.totalCount, 7);
});

Deno.test("bank-account-list: refuses both cursors at once", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await bankAccountList.execute({ after: "a", before: "b" }, ctx),
    Error,
    "only one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bank-account-list: surfaces Lob's error code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_key", "Your API key is not valid.", 401),
  }]);
  await assertRejects(async () => await bankAccountList.execute({}, ctx), Error, "invalid_api_key");
});

Deno.test("bank-account-list: the full account number is stripped from every listed account", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: [{ id: "bank_1", account_number: "123456789", routing_number: "322271627" }],
      count: 1,
    },
  }]);
  const out = await bankAccountList.execute({}, ctx) as { items: Record<string, unknown>[] };
  assertEquals("account_number" in out.items[0], false);
  assertEquals(out.items[0].routing_number, "322271627");
  assert(!JSON.stringify(out).includes("123456789"));
});
