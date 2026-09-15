import { assertEquals, assertRejects } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/list-add-people.ts";

Deno.test("list-add-people: PATCHes add_signups with a parsed id list", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ listId: "1", personIds: "12, 45,90" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/lists/1/add_signups");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { id: "1", type: "lists", signup_ids: ["12", "45", "90"] },
  });
  assertEquals(out, { listId: "1" });
});

Deno.test("list-add-people: rejects an empty id list", async () => {
  const { ctx } = mockNationBuilderCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ listId: "1", personIds: "" }, ctx);
    },
    Error,
    "personIds",
  );
});
