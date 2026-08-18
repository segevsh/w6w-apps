import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/destination-get.ts";

Deno.test("destination-get: fetches one destination", async () => {
  const { ctx, calls } = mockCtx([ok({
    id: "d1",
    service: "snowflake",
    region: "GCP_US_EAST4",
    setup_status: "connected",
  })]);
  const result = await action.execute!({ destinationId: "d1" }, ctx) as { region: string };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/destinations/d1");
  assertEquals(result.region, "GCP_US_EAST4");
});

Deno.test("destination-get: needs a destination id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "destinationId");
  assertEquals(calls.length, 0);
});

/** Region is a compliance answer and cannot be changed after creation. */
Deno.test("destination-get: frames region as a compliance fact", () => {
  assert(/cannot be changed after creation/.test(action.description!), action.description);
});
