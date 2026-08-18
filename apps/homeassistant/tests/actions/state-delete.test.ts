import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/state-delete.ts";

Deno.test("state-delete: removes an entity that has no integration behind it", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  const result = await action.execute!({ entityId: "sensor.office_occupancy" }, ctx);
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/states/sensor.office_occupancy");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true, entityId: "sensor.office_occupancy" });
});

/**
 * Deleting a device-backed entity is at best a no-op — the integration puts it
 * straight back — and in the meantime every dashboard showing it flickers.
 */
Deno.test("state-delete: a device domain is refused, and says what to do instead", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ entityId: "light.kitchen" }, ctx),
    Error,
  );
  assert(/recreates the entity/.test(error.message), error.message);
  assert(/REST API\s+cannot do that/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("state-delete: a friendly name is refused before the request", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Office Occupancy" }, ctx),
    Error,
    "friendly name",
  );
});

Deno.test("state-delete: needs an entity", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entityId` is required");
});

Deno.test("state-delete: is idempotent, and says what it does not remove", () => {
  assertEquals(action.idempotent, true);
  assert(/Only meaningful for entities pushed in/.test(action.description!), action.description);
});
