import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/saved-search-create.ts";

const RESPONSE = { "success": true, "data": { "savedSearchId": "8" } };

Deno.test("saved-search-create: calls POST /api/client/v2/saved-searches and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "name": "US VPs of Sales",
    "type": "contacts",
    "values": { "jobTitle": ["VP of Sales"] },
    "sortColumn": "name",
    "sortOrder": "asc",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/saved-searches");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "US VPs of Sales",
    "type": "contacts",
    "values": { "jobTitle": ["VP of Sales"] },
    "sortColumn": "name",
    "sortOrder": "asc",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("saved-search-create: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({
    "name": "US VPs of Sales",
    "type": "contacts",
    "values": { "jobTitle": ["VP of Sales"] },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "US VPs of Sales",
    "type": "contacts",
    "values": { "jobTitle": ["VP of Sales"] },
  });
});

Deno.test("saved-search-create: refuses a missing name before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await action.execute!(
      { "type": "contacts", "values": { "jobTitle": ["VP of Sales"] } } as never,
      ctx,
    )
  );
  assertEquals(calls.length, 0);
});

Deno.test("saved-search-create: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "US VPs of Sales",
        "type": "contacts",
        "values": { "jobTitle": ["VP of Sales"] },
        "sortColumn": "name",
        "sortOrder": "asc",
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
