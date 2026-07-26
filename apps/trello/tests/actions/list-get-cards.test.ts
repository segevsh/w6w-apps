import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get-cards.ts";

Deno.test("list-get-cards: GETs /lists/{id}/cards", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1" }] }]);
  assertEquals(await action.execute({ id: "l1", limit: 10 }, ctx), [{ id: "c1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/1/lists/l1/cards");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "10");
});
