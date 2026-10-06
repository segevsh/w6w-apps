import { assertEquals } from "@std/assert";
import action from "../../actions/list-monitors.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-monitors: wraps the array response and sends ownership", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1, "name": "Hiring monitor" }] }]);
  const out = await action.execute!({ "ownership": "team" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/signals/monitors");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "ownership": "team" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "monitors": [{ "id": 1, "name": "Hiring monitor" }] });
});
