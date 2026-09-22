import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-property-types.ts";

Deno.test("list-property-types: GETs /v1/propertyTypes with no parameters", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 1, name: "Apartment" }])]);
  const types = await action.execute({}, ctx) as Array<{ id: number; name: string }>;
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/propertyTypes");
  assertEquals(types, [{ id: 1, name: "Apartment" }]);
});

Deno.test("list-property-types: declares no params and reads nothing credential-shaped", () => {
  assertEquals(action.params, []);
  assertEquals(action.resource, "reference");
});
