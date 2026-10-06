import { assertEquals, assertRejects } from "@std/assert";
import heartbeatDelete from "../../actions/heartbeat-delete.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("heartbeat-delete: DELETE /api/v2/heartbeats/{heartbeat_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await heartbeatDelete.execute({ "heartbeat_id": "9" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/heartbeats/9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out, { deleted: true, id: "9" });
});

Deno.test("heartbeat-delete: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await heartbeatDelete.execute({ "heartbeat_id": "9" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("heartbeat-delete: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await heartbeatDelete.execute({ "heartbeat_id": "9" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
