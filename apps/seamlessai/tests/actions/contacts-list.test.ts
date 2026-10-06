import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-list.ts";

const RESPONSE = { "data": [{ "contactId": "1" }] };

Deno.test("contacts-list: calls GET /api/client/v2/contacts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "startDate": "2026-09-01T00:00:00Z",
    "endDate": "2026-10-01T00:00:00Z",
    "page": 2,
    "limit": 100,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/contacts");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "startDate": "2026-09-01T00:00:00Z",
    "endDate": "2026-10-01T00:00:00Z",
    "page": "2",
    "limit": "100",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("contacts-list: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(
    { "startDate": "2026-09-01T00:00:00Z", "endDate": "2026-10-01T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {
    "startDate": "2026-09-01T00:00:00Z",
    "endDate": "2026-10-01T00:00:00Z",
  });
  assertEquals(calls[0].body, null);
});

Deno.test("contacts-list: refuses a missing startDate before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await action.execute!({ "endDate": "2026-10-01T00:00:00Z" } as never, ctx)
  );
  assertEquals(calls.length, 0);
});

Deno.test("contacts-list: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "startDate": "2026-09-01T00:00:00Z",
        "endDate": "2026-10-01T00:00:00Z",
        "page": 2,
        "limit": 100,
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
