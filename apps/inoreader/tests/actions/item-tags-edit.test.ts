import { assertEquals, assertRejects } from "@std/assert";
import edit from "../../actions/item-tags-edit.ts";
import { mockCtx, pathOf, queryAll, queryOf, text } from "../_helpers.ts";

Deno.test("item-tags-edit: repeats i per item and sends a and r", async () => {
  const { ctx, calls } = mockCtx([text("OK")]);
  const out = await edit.execute({
    itemIds: "12345678, 12345679\n12345680",
    addTag: "user/-/label/test",
    removeTag: "user/-/state/com.google/read",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/reader/api/0/edit-tag");
  assertEquals(queryAll(calls[0].url, "i"), ["12345678", "12345679", "12345680"]);
  assertEquals(queryOf(calls[0].url).a, "user/-/label/test");
  assertEquals(queryOf(calls[0].url).r, "user/-/state/com.google/read");
  assertEquals(out, { ok: true, itemCount: 3 });
});

Deno.test("item-tags-edit: needs items and at least one tag; caps at 100 items", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await edit.execute({ itemIds: " ", addTag: "t" }, ctx),
    Error,
    "at least one article",
  );
  await assertRejects(async () => await edit.execute({ itemIds: "1" }, ctx), Error, "tag to add");
  const many = Array.from({ length: 101 }, (_, i) => String(i + 1)).join(",");
  await assertRejects(
    async () => await edit.execute({ itemIds: many, addTag: "t" }, ctx),
    Error,
    "at most 100",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-tags-edit: a 200 without OK is a failure", async () => {
  const { ctx } = mockCtx([text("Error=Invalid item")]);
  await assertRejects(
    async () => await edit.execute({ itemIds: "1", addTag: "t" }, ctx),
    Error,
    "Invalid item",
  );
});
