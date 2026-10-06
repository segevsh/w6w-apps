import { assertEquals, assertRejects } from "@std/assert";
import fileDelete from "../../actions/file-delete.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-delete: posts the id list to the by-ids route, never the delete-all route", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted_count: 2 } }]);
  const out = await fileDelete.execute({ fileIds: "a, b\n" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/upload/delete");
  assertEquals(bodyOf(calls[0]), { file_ids: ["a", "b"] });
  assertEquals(out, { deletedCount: 2 });
});

Deno.test("file-delete: zero or more than 100 ids fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await fileDelete.execute({ fileIds: " , " }, ctx),
    Error,
    "between 1 and 100",
  );
  const many = Array.from({ length: 101 }, (_, i) => `f${i}`).join(",");
  await assertRejects(
    async () => await fileDelete.execute({ fileIds: many }, ctx),
    Error,
    "between 1 and 100",
  );
  assertEquals(calls.length, 0);
});
