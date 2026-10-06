import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-contacts.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-contacts: GET /lists/{name}/contacts encodes the name and pages", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Email: "a@x.com" }] }]);
  const out = await action.execute({ listName: "My List", limit: 5, offset: 10 }, ctx) as {
    count: number;
  };
  assertEquals(pathOf(calls[0].url), "/v4/lists/My%20List/contacts");
  assertEquals(queryOf(calls[0].url), { limit: "5", offset: "10" });
  assertEquals(out.count, 1);
});

Deno.test("list-contacts: list name is required", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
