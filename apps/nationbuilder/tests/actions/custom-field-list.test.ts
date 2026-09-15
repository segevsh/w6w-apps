import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/custom-field-list.ts";

Deno.test("custom-field-list: GETs /custom_fields", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: {
      data: [{ id: "1", type: "custom_fields", attributes: { name: "volunteer_shirt_size" } }],
    },
  }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/custom_fields");
  assertEquals(out.items, [{ id: "1", type: "custom_fields", name: "volunteer_shirt_size" }]);
});
