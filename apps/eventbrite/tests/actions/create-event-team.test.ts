import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event-team.ts";

Deno.test("create-event-team: POSTs team body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({
    eventId: "e1",
    publicEventId: "p1",
    name: "N",
    password: "pw",
    preferredStartTime: "9am",
    extra: { z: 1 },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/e1/teams/create/");
  assertEquals(JSON.parse(calls[0].body!), {
    public_event_id: "p1",
    name: "N",
    password: "pw",
    preferred_start_time: "9am",
    z: 1,
  });
});
