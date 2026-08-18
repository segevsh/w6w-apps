import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/entity-get.ts";

const entity = ok({
  actor: {
    entity: {
      guid: "g1",
      name: "checkout",
      reporting: true,
      alertSeverity: "NOT_ALERTING",
      tags: [{ key: "team", values: ["platform"] }],
    },
  },
});

Deno.test("entity-get: fetches one entity and lifts the useful fields out", async () => {
  const { ctx, calls } = mockCtx([entity], { display });
  const result = await action.execute!({ guid: "g1" }, ctx) as {
    name: string;
    alertSeverity: string;
    tags: unknown[];
  };
  assertEquals(JSON.parse(calls[0].body!).variables.guid, "g1");
  assertEquals(result.name, "checkout");
  assertEquals(result.alertSeverity, "NOT_ALERTING");
  assertEquals(result.tags.length, 1);
});

/**
 * NOT_CONFIGURED means nothing is watching this entity at all — a different and
 * usually worse condition than healthy, and it reads like one.
 */
Deno.test("entity-get: NOT_CONFIGURED is surfaced as unmonitored, not as healthy", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { entity: { guid: "g1", alertSeverity: "NOT_CONFIGURED" } } }),
  ], { display });
  const result = await action.execute!({ guid: "g1" }, ctx) as { unmonitored: boolean };
  assertEquals(result.unmonitored, true);
});

Deno.test("entity-get: an alerting entity is not unmonitored", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { entity: { guid: "g1", alertSeverity: "CRITICAL" } } }),
  ], { display });
  const result = await action.execute!({ guid: "g1" }, ctx) as { unmonitored: boolean };
  assertEquals(result.unmonitored, false);
});

/** GUIDs are region-specific, which is not obvious from looking at one. */
Deno.test("entity-get: a null entity explains the region trap", async () => {
  const { ctx } = mockCtx([ok({ actor: { entity: null } })], { display });
  const error = await assertRejects(
    async () => await action.execute!({ guid: "g1" }, ctx),
    Error,
  );
  assert(/region-specific/.test(error.message), error.message);
});

Deno.test("entity-get: asks for the concrete-type fields through fragments", async () => {
  const { ctx, calls } = mockCtx([entity], { display });
  await action.execute!({ guid: "g1" }, ctx);
  const query = JSON.parse(calls[0].body!).query;
  assert(/\.\.\. on AlertableEntity/.test(query), query);
  assert(/\.\.\. on ApmApplicationEntity/.test(query), query);
});

Deno.test("entity-get: needs a guid", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`guid` is required");
  assertEquals(calls.length, 0);
});
