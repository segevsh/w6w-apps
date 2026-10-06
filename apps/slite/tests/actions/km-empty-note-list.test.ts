import { assertEquals, assertRejects } from "@std/assert";
import kmEmptyNoteList from "../../actions/km-empty-note-list.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("km-empty-note-list: GET /v1/knowledge-management/notes/empty with the documented parameters", async () => {
  const response = { notes: [], total: 0, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await kmEmptyNoteList.execute({ channelIdList: "ch1,ch2" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge-management/notes/empty");
  assertEquals(queryOf(calls[0].url), { channelIdList: "ch2" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("km-empty-note-list: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await kmEmptyNoteList.execute({ channelIdList: "ch1,ch2" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("km-empty-note-list: the review-state and recency filters are not offered", () => {
  const keys = (kmEmptyNoteList.params ?? []).map((p) => p.key);
  assertEquals(keys, ["ownerIdList", "channelIdList", "first", "cursor"]);
});
