import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-signals.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-signals: sends only the set filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": [{ "id": 1, "type": "new_hire" }] },
  }]);
  const out = await action.execute!(
    { "signal_type": "new_hire", "monitor_id": 3, "relevance_scores": "4,5" } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/signals");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "signal_type": "new_hire",
    "monitor_id": "3",
    "relevance_scores": "4,5",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "data": [{ "id": 1, "type": "new_hire" }] });
});

Deno.test("list-signals: surfaces the feature-disabled 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: {} }]);
  const err = await assertRejects(async () => await action.execute!({} as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 404"), msg);
  assert(msg.includes("HTTP 404"), msg);
});
