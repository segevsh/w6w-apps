import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import contactTagAdd from "../../actions/contact-tag-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("contact-tag-add: adds tags via the relationship route", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagAdd.execute({ contactId: "9", tagIds: "1,2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/v1/contacts/9/relationships/tags");
  assertEquals(bodyOf(calls[0]), {
    data: [
      { id: "1", type: "contact_tags" },
      { id: "2", type: "contact_tags" },
    ],
  });
});

/** Kajabi's schema takes an array even for one tag — batching is its own shape. */
test("contact-tag-add: sends one request for several tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await contactTagAdd.execute({ contactId: "9", tagIds: "1, 2 ,3" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals((bodyOf(calls[0]) as { data: unknown[] }).data.length, 3);
});

test("contact-tag-add: a blank tag list fails before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await contactTagAdd.execute({ contactId: "9", tagIds: " " }, ctx);
    },
    Error,
    "at least one tag id",
  );
  assertEquals(calls.length, 0);
});

test("contact-tag-add: is idempotent", () => {
  assertEquals(contactTagAdd.idempotent, true);
});
