import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/entity-tag-delete.ts";

Deno.test("entity-tag-delete: no values removes the whole key", async () => {
  const { ctx, calls, logs } = mockCtx([
    ok({ taggingDeleteTagFromEntity: { errors: [] } }),
  ], { display });
  const result = await action.execute!({ guid: "g1", key: "team" }, ctx) as { wholeKey: boolean };
  const body = JSON.parse(calls[0].body!);
  assert(/taggingDeleteTagFromEntity/.test(body.query), body.query);
  assertEquals(body.variables.tagKeys, ["team"]);
  assertEquals(result.wholeKey, true);
  assertEquals(logs[0].level, "warn");
});

/** A different mutation with a different argument shape. */
Deno.test("entity-tag-delete: given values it removes only those", async () => {
  const { ctx, calls } = mockCtx([
    ok({ taggingDeleteTagValuesFromEntity: { errors: [] } }),
  ], { display });
  const result = await action.execute!({
    guid: "g1",
    key: "team",
    values: "sre, platform",
  }, ctx) as { wholeKey: boolean };
  const body = JSON.parse(calls[0].body!);
  assert(/taggingDeleteTagValuesFromEntity/.test(body.query), body.query);
  assertEquals(body.variables.tagValues, [
    { key: "team", value: "sre" },
    { key: "team", value: "platform" },
  ]);
  assertEquals(result.wholeKey, false);
});

Deno.test("entity-tag-delete: a mutation-payload error throws in either mode", async () => {
  const whole = mockCtx([
    ok({ taggingDeleteTagFromEntity: { errors: [{ message: "nope" }] } }),
  ], { display });
  await assertRejects(
    async () => await action.execute!({ guid: "g1", key: "team" }, whole.ctx),
    Error,
    "nope",
  );

  const values = mockCtx([
    ok({ taggingDeleteTagValuesFromEntity: { errors: [{ message: "nope" }] } }),
  ], { display });
  await assertRejects(
    async () => await action.execute!({ guid: "g1", key: "team", values: "x" }, values.ctx),
    Error,
    "nope",
  );
});

Deno.test("entity-tag-delete: needs a guid and a key", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ key: "t" }, ctx),
    Error,
    "`guid` is required",
  );
  assertEquals(calls.length, 0);
});

/** Alerts and workloads select on tags. */
Deno.test("entity-tag-delete: warns that removing a tag can drop coverage", () => {
  assert(/SELECT on tags/.test(action.description!), action.description);
});
