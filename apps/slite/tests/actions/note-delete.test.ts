import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import noteDelete from "../../actions/note-delete.ts";
import { mockCtx, pathOf, slError } from "../_helpers.ts";

test("note-delete: DELETE /v1/notes/{id}; a bodiless 204 is success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await noteDelete.execute({ noteId: " n1 " }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, noteId: "n1" });
});

test("note-delete: a vendor error is thrown, not reported as deleted", async () => {
  const { ctx } = mockCtx([{ status: 401, body: slError("auth/unauthorized", "Invalid apiKey") }]);
  await assertRejects(
    async () => await noteDelete.execute({ noteId: "n1" }, ctx),
    Error,
    "Slite 401: Invalid apiKey (auth/unauthorized)",
  );
});

test("note-delete: a blank id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await noteDelete.execute({ noteId: " " }, ctx), Error, "noteId");
  assertEquals(calls.length, 0);
});
