import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import workLocationCreate from "../../actions/work-location-create.ts";

Deno.test("work-location-create: folds the flat address params into the nested wire object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1", name: "HQ" } }]);
  await workLocationCreate.execute({
    name: "HQ",
    addressType: "WORK",
    streetAddress: "123 Main St",
    locality: "San Francisco",
    region: "CA",
    postalCode: "94105",
    country: "US",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/work-locations/");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "HQ",
    address: {
      type: "WORK",
      street_address: "123 Main St",
      locality: "San Francisco",
      region: "CA",
      postal_code: "94105",
      country: "US",
    },
  });
});

Deno.test("work-location-create: always sends an address object (it is required) and requires a name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1" } }]);
  await workLocationCreate.execute({ name: "Remote hub" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Remote hub", address: {} });
  await assertRejects(
    () => Promise.resolve().then(() => workLocationCreate.execute({}, ctx)),
    Error,
    "name is required",
  );
  assertEquals(workLocationCreate.idempotent, false);
});
