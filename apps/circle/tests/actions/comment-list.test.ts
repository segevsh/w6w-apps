import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/comment-list.ts";

Deno.test("comment-list: GETs /comments", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/comments`);
});

Deno.test("comment-list: post and space are independent filters, both forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ postId: 9, spaceId: 2, searchText: "bug", page: 1, perPage: 20 }, ctx);
  assertEquals(queryOf(calls[0]), {
    post_id: ["9"],
    space_id: ["2"],
    search_text: ["bug"],
    page: ["1"],
    per_page: ["20"],
  });
});

Deno.test("comment-list: either filter works alone", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ postId: 9 }, ctx);
  assertEquals(queryOf(calls[0]), { post_id: ["9"] });
  await action.execute({ spaceId: 2 }, ctx);
  assertEquals(queryOf(calls[1]), { space_id: ["2"] });
});
