import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/heartbeat-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("heartbeat-create: POSTs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "h1" } } }]);
  const out = await action.execute!({
    entity: "/src/a.ts",
    type: "file",
    time: 1790000000.5,
    isWrite: true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/heartbeats");
  assertEquals(
    calls[0].body,
    '{"entity":"/src/a.ts","type":"file","time":1790000000.5,"is_write":true}',
  );
  assertEquals(out, { data: { id: "h1" } });
});

Deno.test("heartbeat-create: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        entity: "/src/a.ts",
        type: "file",
        time: 1790000000.5,
        isWrite: true,
      }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
