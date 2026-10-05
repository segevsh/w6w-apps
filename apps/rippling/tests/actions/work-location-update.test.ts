import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import workLocationUpdate from "../../actions/work-location-update.ts";

Deno.test("work-location-update: PATCHes only the name and address members that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "w1" } }]);
  await workLocationUpdate.execute({ id: "w1", postalCode: "10001", country: "US" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/work-locations/w1/");
  assertEquals(JSON.parse(calls[0].body!), { address: { postal_code: "10001", country: "US" } });
});

Deno.test("work-location-update: needs an id and something to change", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await assertRejects(
    () => Promise.resolve().then(() => workLocationUpdate.execute({ name: "x" }, ctx)),
    Error,
    "id is required",
  );
  await assertRejects(
    () => Promise.resolve().then(() => workLocationUpdate.execute({ id: "w1" }, ctx)),
    Error,
    "at least one field",
  );
  await workLocationUpdate.execute({ id: "w1", name: "New HQ" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "New HQ" });
});
