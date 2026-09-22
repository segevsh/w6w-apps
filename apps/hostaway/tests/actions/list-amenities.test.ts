import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-amenities.ts";

Deno.test("list-amenities: GETs /v1/amenities with no parameters and unwraps the array", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 1, name: "Cable TV" }])]);
  const amenities = await action.execute({}, ctx) as Array<{ id: number; name: string }>;
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/amenities");
  assertEquals(amenities, [{ id: 1, name: "Cable TV" }]);
});

Deno.test("list-amenities: declares no params, so a host can invoke it with {}", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});
