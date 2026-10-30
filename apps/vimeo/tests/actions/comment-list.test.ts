import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import commentList from "../../actions/comment-list.ts";
import { collection, mockCtx, q, url } from "../_helpers.ts";

const comment = { uri: "/videos/1/comments/12345", text: "I love this!" };

test("comment-list: hits /videos/{id}/comments", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([comment]) }]);
  const out = await commentList.execute({ videoId: "/videos/258684937" }, ctx);
  assertEquals(url(calls[0]).pathname, "/videos/258684937/comments");
  assertEquals(out.total, 1);
});

test("comment-list: forwards direction, pagination and fields", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await commentList.execute(
    { videoId: "1", direction: "desc", page: 2, perPage: 50, fields: "uri, text" },
    ctx,
  );
  assertEquals(q(calls[0], "direction"), "desc");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "50");
  assertEquals(q(calls[0], "fields"), "uri,text");
});

test("comment-list: is a search action", () => {
  assertEquals(commentList.type, "search");
});
