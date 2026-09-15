import { assertEquals, assertRejects } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/list-remove-people.ts";

Deno.test("list-remove-people: PATCHes remove_signups with a parsed id list", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ listId: "1", personIds: "12,45" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/lists/1/remove_signups");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { id: "1", type: "lists", signup_ids: ["12", "45"] },
  });
  assertEquals(out, { listId: "1" });
});

Deno.test("list-remove-people: rejects an empty id list", async () => {
  const { ctx } = mockNationBuilderCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ listId: "1", personIds: "" }, ctx);
    },
    Error,
    "personIds",
  );
});
