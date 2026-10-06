import { assertEquals, assertRejects } from "@std/assert";
import noteArchiveSet from "../../actions/note-archive-set.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-archive-set: PUT /v1/notes/n1/archived with the documented parameters", async () => {
  const response = { id: "n1", archivedAt: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteArchiveSet.execute({ noteId: "n1", archived: false }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1/archived");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { archived: false });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-archive-set: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await noteArchiveSet.execute({ noteId: "n1", archived: false }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-archive-set: true archives, and a non-boolean is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await noteArchiveSet.execute({ noteId: "n1", archived: true }, ctx);
  assertEquals(calls[0].body, '{"archived":true}');
  await assertRejects(
    async () => await noteArchiveSet.execute({ noteId: "n1", archived: undefined as never }, ctx),
    Error,
    "archived",
  );
  assertEquals(calls.length, 1);
});
