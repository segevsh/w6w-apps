import assert from "node:assert/strict";
import { test } from "node:test";
import newDraftPost from "../../triggers/new-draft-post.ts";
import newBlogFollowing from "../../triggers/new-blog-following.ts";
import newPostNote from "../../triggers/new-post-note.ts";
import newQueuedPost from "../../triggers/new-queued-post.ts";
import newSubmission from "../../triggers/new-submission.ts";
import { envelope, mockCtx } from "../_helpers.ts";

const reqOf = (call: { method: string; url: string }) => {
  const u = new URL(call.url);
  return { method: call.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

// ---- newest-first (pollFromListAction) -------------------------------------------------------
const NEWEST = [
  {
    t: newDraftPost,
    params: { blogIdentifier: "example" },
    key: "posts",
    item: (n: number) => ({ id: n, state: "draft" }),
    request: { method: "GET", path: "/v2/blog/example/posts/draft", query: {} },
  },
  {
    t: newBlogFollowing,
    params: { blogIdentifier: "example" },
    key: "blogs",
    item: (n: number) => ({ name: `blog-${n}` }),
    request: {
      method: "GET",
      path: "/v2/blog/example/following",
      query: { limit: "20", offset: "0" },
    },
  },
  {
    t: newPostNote,
    params: { blogIdentifier: "example", id: 77 },
    key: "notes",
    item: (n: number) => ({ type: "like", blog_uuid: `t:${n}`, timestamp: 1700000000 + n }),
    request: { method: "GET", path: "/v2/blog/example/notes", query: { id: "77", mode: "all" } },
  },
];

for (const c of NEWEST) {
  const page = (...ns: number[]) => ({ body: envelope({ [c.key]: ns.map(c.item) }) });
  test(`${c.t.key}: seeds, emits once, retries idempotently, requests newest first`, async () => {
    const seeded = await c.t.poll!(
      { params: c.params, state: {} } as never,
      mockCtx([page(1)]).ctx,
    );
    assert.deepEqual(seeded.events, []);
    assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = mockCtx([page(2, 1)]);
    const out = await c.t.poll!({ params: c.params, state: seeded.nextState } as never, run.ctx);
    assert.deepEqual(out.events, [c.item(2)]);
    assert.deepEqual(
      await c.t.poll!(
        { params: c.params, state: seeded.nextState } as never,
        mockCtx([page(2, 1)]).ctx,
      ),
      out,
    );
    assert.deepEqual(reqOf(run.calls[0]), c.request);
  });
}

// ---- bounded snapshots read by offset --------------------------------------------------------
const post = (id: number) => ({ id, blog_name: "example" });
const params = { blogIdentifier: "example" };

test("new-queued-post: seeds, emits a new id, retries idempotently, requests the literal pages", async () => {
  const full = Array.from({ length: 20 }, (_, i) => post(i + 1));
  const seeded = await newQueuedPost.poll!(
    { params, state: {} } as never,
    mockCtx([{ body: envelope({ posts: [post(1)] }) }]).ctx,
  );
  assert.deepEqual(seeded.events, []);
  const run = mockCtx([
    { body: envelope({ posts: full }) },
    { body: envelope({ posts: [post(21)] }) },
  ]);
  const out = await newQueuedPost.poll!({ params, state: seeded.nextState } as never, run.ctx);
  assert.equal(out.events.length, 20); // ids 2..21: 1 was seen
  assert.deepEqual(run.calls.map(reqOf), [
    { method: "GET", path: "/v2/blog/example/posts/queue", query: { limit: "20", offset: "0" } },
    { method: "GET", path: "/v2/blog/example/posts/queue", query: { limit: "20", offset: "20" } },
  ]);
  const retry = await newQueuedPost.poll!(
    { params, state: seeded.nextState } as never,
    mockCtx([{ body: envelope({ posts: full }) }, { body: envelope({ posts: [post(21)] }) }]).ctx,
  );
  assert.deepEqual(retry, out);
  const again = await newQueuedPost.poll!(
    { params, state: out.nextState } as never,
    mockCtx([{ body: envelope({ posts: full }) }, { body: envelope({ posts: [post(21)] }) }]).ctx,
  );
  assert.deepEqual(again.events, []);
});

test("new-submission: seeds, emits a new id, pages by offset until an empty page, no limit sent", async () => {
  const seeded = await newSubmission.poll!(
    { params, state: {} } as never,
    mockCtx([{ body: envelope({ posts: [post(1)] }) }, { body: envelope({ posts: [] }) }]).ctx,
  );
  assert.deepEqual(seeded.events, []);
  assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
  const body = () => [
    { body: envelope({ posts: [post(2), post(1)] }) },
    { body: envelope({ posts: [] }) },
  ];
  const run = mockCtx(body());
  const out = await newSubmission.poll!({ params, state: seeded.nextState } as never, run.ctx);
  assert.deepEqual(out.events, [post(2)]);
  assert.deepEqual(run.calls.map(reqOf), [
    { method: "GET", path: "/v2/blog/example/posts/submission", query: { offset: "0" } },
    { method: "GET", path: "/v2/blog/example/posts/submission", query: { offset: "2" } },
  ]);
  assert.deepEqual(
    await newSubmission.poll!({ params, state: seeded.nextState } as never, mockCtx(body()).ctx),
    out,
  );
});
