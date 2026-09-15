import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

Deno.test("tag-list: GETs /signup_tags", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: [{ id: "7", type: "signup_tags", attributes: { name: "volunteer" } }] },
  }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/signup_tags");
  assertEquals(out.items, [{ id: "7", type: "signup_tags", name: "volunteer" }]);
});
