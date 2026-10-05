import { assert, assertEquals, assertRejects } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("note-list: maps every filter to the vendor's snake_case query", async () => {
  const page = { notes: [{ id: "not_1d3tmYTlCICgjy" }], hasMore: true, cursor: "c2" };
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await noteList.execute({
    createdAfter: "2026-01-01",
    createdBefore: "2026-02-01T00:00:00Z",
    updatedAfter: "2026-01-15",
    folderId: "fol_4y6LduVdwSKC27",
    cursor: "c1",
    pageSize: 5,
  }, ctx);
  assertEquals(out, page);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/notes");
  assertEquals(queryOf(calls[0].url), {
    created_after: "2026-01-01",
    created_before: "2026-02-01T00:00:00Z",
    updated_after: "2026-01-15",
    folder_id: "fol_4y6LduVdwSKC27",
    cursor: "c1",
    page_size: "5",
  });
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("note-list: no filters sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { notes: [], hasMore: false, cursor: null } }]);
  await noteList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("note-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BAD_REQUEST", message: "bad date" } }]);
  const err = await assertRejects(async () => await noteList.execute({ createdAfter: "x" }, ctx));
  assert(String((err as Error).message).includes("400 (BAD_REQUEST)"));
  assert(String((err as Error).message).includes("bad date"));
});
