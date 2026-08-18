import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/logbook-get.ts";

const entries = ok([
  { name: "Kitchen light", message: "turned on", context_entity_id: "automation.morning" },
  { name: "Alice", message: "arrived home" },
  { name: "Hall light", message: "turned off", context_entity_id: "automation.goodnight" },
]);

/** The causal link is the thing the history API does not have. */
Deno.test("logbook-get: counts the entries an automation caused", async () => {
  const { ctx, calls } = mockCtx([entries], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    triggeredByAutomation: number;
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/logbook");
  assertEquals(result.count, 3);
  assertEquals(result.triggeredByAutomation, 2);
});

Deno.test("logbook-get: narrowing to one entity uses the entity parameter", async () => {
  const { ctx, calls } = mockCtx([entries], { display });
  await action.execute!({ entityId: "light.kitchen" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("entity"), "light.kitchen");
});

Deno.test("logbook-get: the start time goes in the path", async () => {
  const { ctx, calls } = mockCtx([entries], { display });
  await action.execute!({
    startTime: "2026-08-17T00:00:00+00:00",
    endTime: "2026-08-18T00:00:00+00:00",
  }, ctx);
  const url = new URL(calls[0].url);
  assert(url.pathname.startsWith("/api/logbook/2026-08-17"), url.pathname);
  assertEquals(url.searchParams.get("end_time"), "2026-08-18T00:00:00+00:00");
});

Deno.test("logbook-get: a friendly name is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Kitchen Light" }, ctx),
    Error,
    "friendly name",
  );
});

Deno.test("logbook-get: an empty period is a count of zero", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("logbook-get: logs a count, never the entries", async () => {
  const { ctx, logs } = mockCtx([entries], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("Alice"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 3 });
});

/** History says what changed; the logbook says why. */
Deno.test("logbook-get: says what separates it from history", () => {
  assert(
    /History says what changed; the logbook says why/.test(action.description!),
    action.description,
  );
});
