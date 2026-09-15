import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/list-get.ts";

Deno.test("list-get: GETs /lists/{id}", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "1", type: "lists", attributes: { name: "Volunteers" } } },
  }]);
  const out = await action.execute({ listId: "1" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/lists/1");
  assertEquals(out, { id: "1", type: "lists", name: "Volunteers" });
});
