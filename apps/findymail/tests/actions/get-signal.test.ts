import { assertEquals } from "@std/assert";
import action from "../../actions/get-signal.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-signal: GETs the signal by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 5, "type": "job_change" } }]);
  const out = await action.execute!({ "id": 5 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/signals/5");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "id": 5, "type": "job_change" });
});
