import { assertEquals, assertRejects } from "@std/assert";
import noteGet from "../../actions/note-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-get: GET /api/v1/note/n1 on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { note: { id: "n1", title: "T" } } }]);
  const out = await noteGet.execute({ noteId: "n1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/note/n1");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals((out as { id: string }).id, "n1");
});

Deno.test("note-get: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(noteGet.execute({ noteId: "n1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
