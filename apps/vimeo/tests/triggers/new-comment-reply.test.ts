import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCommentReply from "../../triggers/new-comment-reply.ts";

const reply = (id: string) => ({ uri: `/videos/258684937/comments/987/replies/${id}`, text: id });
const input = { params: { videoId: "258684937", commentId: "987" }, subscriptionId: "sub-1" };
const U = "https://api.vimeo.com/videos/258684937/comments/987/replies";
const body = (data: unknown[], next: string | null = null) => ({
  body: { data, paging: { next } },
});

test("new-comment-reply: requires videoId and commentId", () => {
  const req = newCommentReply.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(req, ["videoId", "commentId"]);
});

test("new-comment-reply: seeds, sends the documented request, emits only new replies, idempotent", async () => {
  const seed = mockCtx([body([reply("a")])]);
  const s = await newCommentReply.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${U}?page=1&per_page=100`);
  const run = () =>
    newCommentReply.poll!(
      { ...input, state: s.nextState },
      mockCtx([body([reply("a"), reply("b")])]).ctx,
    );
  const n = await run();
  assertEquals(n.events, [reply("b")]);
  assertEquals(await run(), n);
  const again = await newCommentReply.poll!(
    { ...input, state: n.nextState },
    mockCtx([body([reply("a"), reply("b")])]).ctx,
  );
  assertEquals(again.events, []);
});

test("new-comment-reply: reads every page of a long thread", async () => {
  const a = Array.from({ length: 100 }, (_, i) => reply(`p1_${i}`));
  const b = [reply("p2_0")];
  const s = await newCommentReply.poll!({ ...input, state: {} }, mockCtx([body(a)]).ctx);
  const c = mockCtx([body(a, "/next"), body(b)]);
  const r = await newCommentReply.poll!({ ...input, state: s.nextState }, c.ctx);
  assertEquals(c.calls.length, 2);
  assertEquals(c.calls[1].url, `${U}?page=2&per_page=100`);
  assertEquals(r.events, b);
});

test("new-comment-reply: a thread beyond 5 pages fails the check loudly", async () => {
  const mk = () => body([reply("x")], "/next");
  let msg = "";
  try {
    await newCommentReply.poll!(
      { ...input, state: {} },
      mockCtx([mk(), mk(), mk(), mk(), mk()]).ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("more than 5 pages"), true);
});
