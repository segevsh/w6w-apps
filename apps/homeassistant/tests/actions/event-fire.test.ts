import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/event-fire.ts";

const fired = ok({ message: "Event delivery_arrived fired." });

Deno.test("event-fire: posts the event type and its data", async () => {
  const { ctx, calls } = mockCtx([fired], { display });
  const result = await action.execute!({
    eventType: "delivery_arrived",
    data: '{"courier":"dpd"}',
  }, ctx) as { fired: boolean; message: string };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/events/delivery_arrived");
  assertEquals(JSON.parse(calls[0].body!), { courier: "dpd" });
  assertEquals(result.fired, true);
  assert(/fired/.test(result.message), result.message);
});

/** Forging a core event puts the state machine and recorder into a bad state. */
Deno.test("event-fire: core Home Assistant events are refused", async () => {
  for (
    const type of ["state_changed", "call_service", "homeassistant_start", "automation_triggered"]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    const error = await assertRejects(
      async () => await action.execute!({ eventType: type }, ctx),
      Error,
    );
    assert(/emits itself/.test(error.message), error.message);
    assert(/custom event type/.test(error.message), error.message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("event-fire: a custom type with no data still posts an object", async () => {
  const { ctx, calls } = mockCtx([fired], { display });
  await action.execute!({ eventType: "my_event" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("event-fire: needs an event type", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`eventType` is required");
});

Deno.test("event-fire: logs the type, never the data", async () => {
  const { ctx, logs } = mockCtx([fired], { display });
  await action.execute!({ eventType: "my_event", data: '{"secret":"tuna"}' }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { eventType: "my_event" });
});

/** Firing always succeeds, whether or not anything listened. */
Deno.test("event-fire: says nothing reports whether anything listened", () => {
  assert(/Nothing reports whether anything listened/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
