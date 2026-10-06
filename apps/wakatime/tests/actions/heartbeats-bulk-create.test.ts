import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/heartbeats-bulk-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("heartbeats-bulk-create: POSTs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: [] } }]);
  const out = await action.execute!({
    heartbeats: '[{"entity":"/a.ts","type":"file","time":1790000000}]',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/heartbeats.bulk");
  assertEquals(calls[0].body, '[{"entity":"/a.ts","type":"file","time":1790000000}]');
  assertEquals(out, { responses: [] });
});

Deno.test("heartbeats-bulk-create: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { heartbeats: '[{"entity":"/a.ts","type":"file","time":1790000000}]' },
        ctx,
      ),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});

Deno.test("heartbeats-bulk-create: rejects more than 25 and non-arrays before any call", async () => {
  const { ctx, calls } = mockCtx([]);
  const many = JSON.stringify(Array.from({ length: 26 }, () => ({ entity: "a", type: "file" })));
  await assertRejects(
    async () => await action.execute!({ heartbeats: many }, ctx),
    Error,
    "at most 25",
  );
  await assertRejects(
    async () => await action.execute!({ heartbeats: "{}" }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});
