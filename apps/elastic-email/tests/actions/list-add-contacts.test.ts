import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-add-contacts.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-add-contacts: POST /lists/{name}/contacts with Emails", async () => {
  const { ctx, calls } = mockCtx([{ body: { ListName: "News", PublicListID: "p" } }]);
  const out = await action.execute({ listName: "News", emails: "a@x.com, b@x.com" }, ctx) as {
    ListName: string;
  };
  assertEquals(out.ListName, "News");
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v4/lists/News/contacts");
  assertEquals(JSON.parse(calls[0].body!), { Emails: ["a@x.com", "b@x.com"] });
});

Deno.test("list-add-contacts: a rule works alone; emails + rule, or neither, is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ listName: "News", rule: "All" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { Rule: "All" });
  await assertRejects(
    async () =>
      await action.execute({ listName: "N", emails: "a@x.com", rule: "All" }, mockCtx().ctx),
    Error,
    "either",
  );
  await assertRejects(
    async () => await action.execute({ listName: "N" }, mockCtx().ctx),
    Error,
    "either",
  );
  await assertRejects(
    async () => await action.execute({ emails: "a@x.com" }, mockCtx().ctx),
    Error,
    "List name",
  );
});
