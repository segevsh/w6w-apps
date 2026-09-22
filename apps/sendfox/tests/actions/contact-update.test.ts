import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes the mapped body to /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, email: "a@b.c" } }]);
  await contactUpdate.execute({ id: 4, firstName: "Ada", lists: [3] }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/contacts/4");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { first_name: "Ada", lists: [3] });
});

/**
 * The document says `lists` "replaces all current list memberships". An empty
 * array therefore means "remove from every list" and must survive compaction —
 * treating it as "unset" would make that impossible to express.
 */
Deno.test("contact-update: an explicit empty list is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4 } }]);
  await contactUpdate.execute({ id: 4, lists: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { lists: [] });
});

Deno.test("contact-update: an omitted list is left out", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4 } }]);
  await contactUpdate.execute({ id: 4, lastName: "Lovelace" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { last_name: "Lovelace" });
});

Deno.test("contact-update: the list param hint warns that it replaces memberships", () => {
  const lists = (contactUpdate.params ?? []).find((p) => p.key === "lists");
  assertEquals(/REPLACES/.test(lists?.hint ?? ""), true, lists?.hint);
});
