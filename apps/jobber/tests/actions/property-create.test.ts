import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/property-create.ts";

Deno.test("property-create: client is an argument, the address is wrapped in a properties list", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { propertyCreate: { properties: [{ id: "p1" }], userErrors: [] } } },
  }]);
  await action.execute({
    clientId: "c1",
    name: "North yard",
    street1: "1 Main St",
    city: "Denver",
    province: "CO",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    clientId: "c1",
    input: {
      properties: [{
        name: "North yard",
        address: { street1: "1 Main St", city: "Denver", province: "CO" },
      }],
    },
  });
});

Deno.test("property-create: userErrors throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        propertyCreate: { properties: [], userErrors: [{ message: "Address is invalid" }] },
      },
    },
  }]);
  await assertRejects(
    async () => await action.execute({ clientId: "c1", street1: "x" }, ctx),
    Error,
    "Address is invalid",
  );
});
