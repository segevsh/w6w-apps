import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/reminder-list.ts";

Deno.test("reminder-list: lists a category, maps next_set_token", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "category": "others", "list": [{ "id": "r1" }], "next_set_token": "10" },
  }]);
  const out = await action.execute(
    { "category": "others", "limit": 2, "nextSetToken": "9" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/reminders");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "category": "others",
    "limit": "2",
    "next_set_token": "9",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "category": "others",
    "reminders": [{ "id": "r1" }],
    "nextSetToken": "10",
  });
});

Deno.test("reminder-list: is a read action", () => {
  assertEquals(action.type, "read");
});
