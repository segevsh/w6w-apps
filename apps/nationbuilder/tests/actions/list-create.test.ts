import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

Deno.test("list-create: POSTs /lists", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "1", type: "lists", attributes: { name: "Volunteers" } } },
  }]);
  const out = await action.execute(
    { name: "Volunteers", description: "People who signed up" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/lists");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "lists",
      attributes: { name: "Volunteers", description: "People who signed up" },
    },
  });
  assertEquals(out, { id: "1", type: "lists", name: "Volunteers" });
});
