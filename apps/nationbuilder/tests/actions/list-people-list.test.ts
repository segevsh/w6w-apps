import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/list-people-list.ts";

Deno.test("list-people-list: GETs /lists/{id}/signups", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: [{ id: "42", type: "signups", attributes: { first_name: "Kim" } }] },
  }]);
  const out = await action.execute({ listId: "1", pageNumber: 2 }, ctx) as { items: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/lists/1/signups");
  assertEquals(url.searchParams.get("page[number]"), "2");
  assertEquals(out.items, [{ id: "42", type: "signups", first_name: "Kim" }]);
});
