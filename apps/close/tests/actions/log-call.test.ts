import { assert, assertEquals } from "@std/assert";
import { description, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/log-call.ts";

Deno.test("log-call: POSTs /activity/call/ and pins source to External", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "acti_1" } }]);
  await action.execute({ leadId: "lead_1", direction: "outbound", status: "completed" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/activity/call/");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.lead_id, "lead_1");
  assertEquals(sent.direction, "outbound");
  assertEquals(sent.status, "completed");
  // "Close.io" would claim the call went through Close's own dialer, which is
  // untrue for a call logged after the fact.
  assertEquals(sent.source, "External");
});

Deno.test("log-call: does not expose source as a caller-settable param", () => {
  assertEquals((action.params ?? []).some((p) => p.key === "source"), false);
});

Deno.test("log-call: maps duration, phone, recording and outcome", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    leadId: "lead_1",
    duration: 125,
    phone: "+18004445555",
    recordingUrl: "https://rec.example/1.mp3",
    outcomeId: "outcome_1",
    activityAt: "2026-01-05T10:00:00+00:00",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.duration, 125);
  assertEquals(sent.phone, "+18004445555");
  assertEquals(sent.recording_url, "https://rec.example/1.mp3");
  assertEquals(sent.outcome_id, "outcome_1");
  assertEquals(sent.activity_at, "2026-01-05T10:00:00+00:00");
});

Deno.test("log-call: offers Close's documented status and direction vocabularies", () => {
  const values = optionValues(action, "status").sort();
  assertEquals(values, [
    "busy",
    "cancel",
    "completed",
    "created",
    "failed",
    "in-progress",
    "no-answer",
    "timeout",
  ]);
  assertEquals(optionValues(action, "direction").sort(), ["inbound", "outbound"]);
});

Deno.test("log-call: states that it records history rather than dialling", () => {
  assert(/does not dial/i.test(description(action)));
  assertEquals(action.idempotent, false);
});
