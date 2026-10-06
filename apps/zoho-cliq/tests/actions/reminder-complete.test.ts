import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/reminder-complete.ts";

Deno.test("reminder-complete: completes", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 204 }]);
  const out = await action.execute({ "reminderId": "r1" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/reminders/r1/complete");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "success": true });
});

Deno.test("reminder-complete: idempotent is declared as true", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
