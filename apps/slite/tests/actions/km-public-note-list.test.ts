import { assertEquals, assertRejects } from "@std/assert";
import kmPublicNoteList from "../../actions/km-public-note-list.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("km-public-note-list: GET /v1/knowledge-management/notes/public with the documented parameters", async () => {
  const response = { notes: [], total: 0, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await kmPublicNoteList.execute({ reviewStateList: "Verified", first: 5 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge-management/notes/public");
  assertEquals(queryOf(calls[0].url), { reviewStateList: "Verified", first: "5" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("km-public-note-list: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await kmPublicNoteList.execute({ reviewStateList: "Verified", first: 5 }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
