import { assertEquals, assertRejects } from "@std/assert";
import contactTagRemove from "../../actions/contact-tag-remove.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-remove: removes tags via the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagRemove.execute({ contactId: "9", tagIds: "1,2" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/tags");
  assertEquals(bodyOf(calls[0]), {
    data: [
      { id: "1", type: "contact_tags" },
      { id: "2", type: "contact_tags" },
    ],
  });
});

/** Kajabi's schema takes an array even for one tag — batching is its own shape. */
Deno.test("contact-tag-remove: sends one request for several tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagRemove.execute({ contactId: "9", tagIds: "1, 2 ,3" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals((bodyOf(calls[0]) as { data: unknown[] }).data.length, 3);
});

Deno.test("contact-tag-remove: a blank tag list fails before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await contactTagRemove.execute({ contactId: "9", tagIds: " " }, ctx);
    },
    Error,
    "at least one tag id",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-tag-remove: is idempotent", () => {
  assertEquals(contactTagRemove.idempotent, true);
});
