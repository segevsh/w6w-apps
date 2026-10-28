import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: gets by email, asks for all fields", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "data": { "id": "7", "email_id": "a@b.com" } },
  }]);
  const out = await action.execute({ "user": "a@b.com" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/users/a%40b.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "fields": "all" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "user": { "id": "7", "email_id": "a@b.com" },
  });
});

Deno.test("user-get: is a read action", () => {
  assertEquals(action.type, "read");
});
