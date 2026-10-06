import { assertEquals, assertRejects } from "@std/assert";
import noteChildrenList from "../../actions/note-children-list.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-children-list: GET /v1/notes/n1/children with the documented parameters", async () => {
  const response = { notes: [], total: 0, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteChildrenList.execute({
    noteId: "n1",
    orderBy: "listPosition",
    orderDirection: "desc",
    includeDescendants: true,
    cursor: "c",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1/children");
  assertEquals(queryOf(calls[0].url), {
    orderBy: "listPosition",
    orderDirection: "desc",
    includeDescendants: "true",
    cursor: "c",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-children-list: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await noteChildrenList.execute({
        noteId: "n1",
        orderBy: "listPosition",
        orderDirection: "desc",
        includeDescendants: true,
        cursor: "c",
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
