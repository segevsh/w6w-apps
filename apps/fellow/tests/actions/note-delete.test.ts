import { assertEquals, assertRejects } from "@std/assert";
import noteDelete from "../../actions/note-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-delete: DELETE /api/v1/note/n1 on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "deleted" } }]);
  const out = await noteDelete.execute({ noteId: "n1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/note/n1");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals((out as { message: string }).message, "deleted");
});

Deno.test("note-delete: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(noteDelete.execute({ noteId: "n1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
