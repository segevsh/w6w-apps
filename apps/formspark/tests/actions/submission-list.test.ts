import { assertEquals } from "@std/assert";
import submissionList from "../../actions/submission-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("submission-list: GET /forms/{id}/submissions with paging and search", async () => {
  const sub = { id: "sub_1", formId: "f1", data: { email: "a@b.c" }, createdAt: "x" };
  const { ctx, calls } = mockCtx([{ body: page([sub], { hasMore: true, nextCursor: "n" }) }]);
  const out = await submissionList.execute(
    { formId: "f1", limit: 100, startingAfter: "c", search: "hello" },
    ctx,
  ) as { data: unknown[]; nextCursor: string };
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1/submissions");
  assertEquals(queryOf(calls[0].url), { limit: "100", startingAfter: "c", search: "hello" });
  assertEquals(out.data, [sub]);
  assertEquals(out.nextCursor, "n");
});
