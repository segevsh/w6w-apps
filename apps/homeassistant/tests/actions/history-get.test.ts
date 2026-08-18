import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/history-get.ts";

const history = ok([
  [
    { entity_id: "sensor.temp", state: "20.0", last_changed: "2026-08-17T10:00:00+00:00" },
    { state: "21.5", last_changed: "2026-08-17T11:00:00+00:00" },
  ],
]);

Deno.test("history-get: requires entity ids and sends them as the filter", async () => {
  const { ctx, calls } = mockCtx([history], { display });
  const result = await action.execute!({ entityId: "sensor.temp" }, ctx) as {
    count: number;
    entities: number;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/history/period");
  assertEquals(url.searchParams.get("filter_entity_id"), "sensor.temp");
  assertEquals(result.entities, 1);
  assertEquals(result.count, 2);
});

/**
 * The docs call the filter optional. Omitting it asks the recorder for every
 * entity, which can occupy a small instance for minutes.
 */
Deno.test("history-get: refuses to query without entities, unlike the API", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entityId` is required");
  assertEquals(calls.length, 0);
});

/** The un-flagged response is rarely what anyone wants. */
Deno.test("history-get: the three size flags default on", async () => {
  const { ctx, calls } = mockCtx([history], { display });
  await action.execute!({ entityId: "sensor.temp" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("minimal_response"), true);
  assertEquals(url.searchParams.has("no_attributes"), true);
  assertEquals(url.searchParams.has("significant_changes_only"), true);
});

Deno.test("history-get: each flag can be turned off individually", async () => {
  const { ctx, calls } = mockCtx([history], { display });
  await action.execute!({
    entityId: "sensor.temp",
    minimalResponse: false,
    noAttributes: false,
    significantChangesOnly: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("minimal_response"), false);
  assertEquals(url.searchParams.has("no_attributes"), false);
  assertEquals(url.searchParams.has("significant_changes_only"), false);
});

Deno.test("history-get: the start time goes in the path and the end in the query", async () => {
  const { ctx, calls } = mockCtx([history], { display });
  await action.execute!({
    entityId: "sensor.temp",
    startTime: "2026-08-17T00:00:00+00:00",
    endTime: "2026-08-18T00:00:00+00:00",
  }, ctx);
  const url = new URL(calls[0].url);
  assert(url.pathname.startsWith("/api/history/period/2026-08-17"), url.pathname);
  assertEquals(url.searchParams.get("end_time"), "2026-08-18T00:00:00+00:00");
});

/** The recorder's retention is ten days by default, and entities can be excluded. */
Deno.test("history-get: entities with no recorded history are reported", async () => {
  const { ctx } = mockCtx([history], { display });
  const result = await action.execute!({ entityId: "sensor.temp, sensor.excluded" }, ctx) as {
    missing: string[];
  };
  assertEquals(result.missing, ["sensor.excluded"]);
});

Deno.test("history-get: a friendly name is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Temperature" }, ctx),
    Error,
    "friendly name",
  );
});

Deno.test("history-get: logs counts", async () => {
  const { ctx, logs } = mockCtx([history], { display });
  await action.execute!({ entityId: "sensor.temp" }, ctx);
  assertEquals(logs[0].data, { entities: 1, count: 2, missing: 0 });
});
