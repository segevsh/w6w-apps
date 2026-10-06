import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/external-duration-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("external-duration-create: POSTs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "e1" } } }]);
  const out = await action.execute!({
    externalId: "evt1",
    entity: "Standup",
    type: "event",
    startTime: 100,
    endTime: 160,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/external_durations");
  assertEquals(
    calls[0].body,
    '{"external_id":"evt1","entity":"Standup","type":"event","start_time":100,"end_time":160}',
  );
  assertEquals(out, { data: { id: "e1" } });
});

Deno.test("external-duration-create: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        externalId: "evt1",
        entity: "Standup",
        type: "event",
        startTime: 100,
        endTime: 160,
      }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
