import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/ping.ts";

test("ping: GETs /ping and returns the raw health status", async () => {
  const { ctx, calls } = mockCtx([{ body: { health_status: "Everything's Chimpy!" } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/3.0/ping");
  assertEquals(result, { health_status: "Everything's Chimpy!" });
});

test("ping: is tagged into the health surface as a fatal, connection-scoped credential check", () => {
  assertEquals(action.healthCheck?.kind, "credential");
});
