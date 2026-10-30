import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import locationCreate from "../../actions/location-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const LOCATION = { id: "lc_1", name: "HQ", description: "1 Market St" };

test("location-create: POSTs name and description", async () => {
  const { ctx, calls } = mockCtx([{ body: LOCATION }]);
  const result = await locationCreate.execute(
    { name: "HQ", description: "1 Market St" },
    ctx,
  ) as typeof LOCATION;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/locations");
  assertEquals(bodyOf(calls[0]), { name: "HQ", description: "1 Market St" });
  assertEquals(result.id, "lc_1");
});

test("location-create: description is optional and left off the wire when empty", async () => {
  const { ctx, calls } = mockCtx([{ body: LOCATION }]);
  await locationCreate.execute({ name: "HQ" }, ctx);

  assertEquals(bodyOf(calls[0]), { name: "HQ" });
});

test("location-create: an idempotency key is forwarded, never invented", async () => {
  const withKey = mockCtx([{ body: LOCATION }]);
  await locationCreate.execute({ name: "HQ", idempotencyKey: "k1" }, withKey.ctx);
  assertEquals(withKey.calls[0].headers["idempotency-key"], "k1");

  const withoutKey = mockCtx([{ body: LOCATION }]);
  await locationCreate.execute({ name: "HQ" }, withoutKey.ctx);
  assertEquals(withoutKey.calls[0].headers["idempotency-key"], undefined);
});

test("location-create: a create is not declared idempotent", () => {
  assertEquals(locationCreate.type, "perform");
  assertEquals(locationCreate.idempotent, false);
  assertEquals(locationCreate.params?.find((p) => p.key === "name")?.required, true);
});
