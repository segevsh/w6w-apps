import { assertEquals, assertRejects } from "@std/assert";
import kmNoteList from "../../actions/km-note-list.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("km-note-list: GET /v1/knowledge-management/notes with the documented parameters", async () => {
  const response = { notes: [], total: 0, hasNextPage: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await kmNoteList.execute({
    reviewStateList: ["Outdated", "Verified"],
    ownerIdList: "u1, u2",
    channelIdList: ["ch"],
    sinceDaysAgo: 30,
    first: 10,
    cursor: "c",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/knowledge-management/notes");
  assertEquals(queryOf(calls[0].url), {
    reviewStateList: "Verified",
    ownerIdList: "u2",
    channelIdList: "ch",
    sinceDaysAgo: "30",
    first: "10",
    cursor: "c",
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("reviewStateList"), [
    "Outdated",
    "Verified",
  ]);
  assertEquals(new URL(calls[0].url).searchParams.getAll("ownerIdList"), ["u1", "u2"]);
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("km-note-list: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () =>
      await kmNoteList.execute({
        reviewStateList: ["Outdated", "Verified"],
        ownerIdList: "u1, u2",
        channelIdList: ["ch"],
        sinceDaysAgo: 30,
        first: 10,
        cursor: "c",
      }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
