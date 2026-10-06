import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: lists users, maps paging", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "data": [{ "id": "1" }], "has_more": true, "next_token": "n2" },
  }]);
  const out = await action.execute(
    { "search": "sc", "status": "active", "limit": 50, "nextToken": "tok" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "search": "sc",
    "status": "active",
    "limit": "50",
    "next_token": "tok",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "users": [{ "id": "1" }],
    "hasMore": true,
    "nextToken": "n2",
  });
});

Deno.test("user-list: empty page", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "data": [] } }]);
  const out = await action.execute({} as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "users": [], "hasMore": false });
});

Deno.test("user-list: is a read action", () => {
  assertEquals(action.type, "read");
});
