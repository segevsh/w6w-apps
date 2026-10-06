import { assertEquals, assertRejects } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-list: GET /v1/notes with the documented parameters", async () => {
  const response = { notes: [{ id: "n1" }], total: 1, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteList.execute({
    ownerId: "u1",
    parentNoteId: "p1",
    orderBy: "lastEditedAt_DESC",
    cursor: "c1",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/notes");
  assertEquals(queryOf(calls[0].url), {
    ownerId: "u1",
    parentNoteId: "p1",
    orderBy: "lastEditedAt_DESC",
    cursor: "c1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-list: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await noteList.execute({
        ownerId: "u1",
        parentNoteId: "p1",
        orderBy: "lastEditedAt_DESC",
        cursor: "c1",
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
