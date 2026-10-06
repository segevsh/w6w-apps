import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-remove-contacts.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-remove-contacts: POST /lists/{name}/contacts/remove; empty 200 becomes {removed}", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ listName: "News", emails: "a@x.com" }, ctx);
  assertEquals(out, { removed: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v4/lists/News/contacts/remove");
  assertEquals(JSON.parse(calls[0].body!), { Emails: ["a@x.com"] });
});

Deno.test("list-remove-contacts: needs exactly one of emails or rule", async () => {
  await assertRejects(
    async () => await action.execute({ listName: "N" }, mockCtx().ctx),
    Error,
    "either",
  );
});
