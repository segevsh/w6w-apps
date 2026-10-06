import { assertEquals, assertRejects } from "@std/assert";
import kmInactiveNoteList from "../../actions/km-inactive-note-list.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("km-inactive-note-list: GET /v1/knowledge-management/notes/inactive with the documented parameters", async () => {
  const response = { notes: [{ id: "n1" }], total: 1, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await kmInactiveNoteList.execute({
    ownerIdList: ["u1"],
    first: 7,
    reviewStateList: "Verified",
    sinceDaysAgo: 9,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge-management/notes/inactive");
  assertEquals(queryOf(calls[0].url), { ownerIdList: "u1", first: "7" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("km-inactive-note-list: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await kmInactiveNoteList.execute({
        ownerIdList: ["u1"],
        first: 7,
        reviewStateList: "Verified",
        sinceDaysAgo: 9,
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("km-inactive-note-list: the review-state and recency filters are not offered", () => {
  const keys = (kmInactiveNoteList.params ?? []).map((p) => p.key);
  assertEquals(keys, ["ownerIdList", "channelIdList", "first", "cursor"]);
});
