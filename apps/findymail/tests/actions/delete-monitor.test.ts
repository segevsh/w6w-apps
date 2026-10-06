import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-monitor.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("delete-monitor: DELETEs the monitor (204, empty body)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ "id": 4 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/signals/monitors/4");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "deleted": true, "id": 4 });
});

Deno.test("delete-monitor: surfaces a 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { "message": "This action is unauthorized." } }]);
  const err = await assertRejects(async () => await action.execute!({ "id": 4 } as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 403"), msg);
  assert(msg.includes("unauthorized"), msg);
});
