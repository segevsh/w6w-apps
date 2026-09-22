import { assertEquals } from "@std/assert";
import contactListUpdate from "../../actions/contact-list-update.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("contact-list-update: PUTs the new name and returns the list's id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "507f191e810c19729de860ea" } }]);
  const result = await contactListUpdate.execute(
    { listId: "507f191e810c19729de860ea", name: "My Newer List" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists/507f191e810c19729de860ea`);
  assertEquals(bodyOf(calls[0]), { name: "My Newer List" });
  assertEquals(result.id, "507f191e810c19729de860ea");
});

/** The document spells this path parameter `{listId}`, but a name is accepted too. */
Deno.test("contact-list-update: also accepts a name in the listId param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await contactListUpdate.execute({ listId: "My First List", name: "Renamed" }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists/My%20First%20List`);
});

Deno.test("contact-list-update: declared idempotent — the same name twice is the same state", () => {
  assertEquals(contactListUpdate.idempotent, true);
});
