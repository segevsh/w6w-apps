import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newComment from "../../triggers/new-comment.ts";
import newStory from "../../triggers/new-story.ts";
import newAccount from "../../triggers/new-instagram-account.ts";

const BASE = "https://graph.facebook.com/v23.0";
const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded?: boolean }).seeded;

test("new-comment: seeds, emits the new comment, retries idempotently, requests newest-first page", async () => {
  const input = { params: { mediaId: "178" }, state: {}, subscriptionId: "sub" };
  const seed = mockCtx([{ body: { data: [{ id: "c1" }] } }]);
  const seeded = await newComment.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded), true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    `${BASE}/178/comments?fields=id%2Ctext%2Ctimestamp%2Cusername%2Clike_count%2Chidden&limit=50`,
  );
  const page = [{ id: "c2" }, { id: "c1" }];
  const run = () =>
    newComment.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { data: page } }]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [{ id: "c2" }]);
  assertEquals(await run(), first);
});

test("new-story: seeds, emits only a story that appeared, retries, requests the stories edge", async () => {
  const input = { params: { igUserId: "17" }, state: {}, subscriptionId: "sub" };
  const seed = mockCtx([{ body: { data: [{ id: "s1" }] } }]);
  const seeded = await newStory.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded), true);
  assertEquals(
    seed.calls[0].url,
    `${BASE}/17/stories?fields=id%2Cmedia_type%2Cmedia_url%2Cpermalink%2Cthumbnail_url%2Ctimestamp`,
  );
  const page = { data: [{ id: "s1" }, { id: "s2" }] };
  const run = () =>
    newStory.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events, [{ id: "s2" }]);
  assertEquals(await run(), first);
});

test("new-instagram-account: seeds, emits a newly managed Page, retries, requests /me/accounts", async () => {
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seed = mockCtx([{ body: { data: [{ id: "p1" }] } }]);
  const seeded = await newAccount.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded), true);
  assertEquals(
    seed.calls[0].url,
    `${BASE}/me/accounts?fields=id%2Cname%2Cinstagram_business_account%7Bid%2Cusername%2Cname%2Cprofile_picture_url%7D&limit=100`,
  );
  const page = { data: [{ id: "p1" }, { id: "p2" }] };
  const run = () =>
    newAccount.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events, [{ id: "p2" }]);
  assertEquals(await run(), first);
});

test("new-instagram-account: follows the after cursor across pages and refuses a huge set", async () => {
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const two = mockCtx([
    { body: { data: [{ id: "p1" }], paging: { cursors: { after: "CUR" }, next: "https://x" } } },
    { body: { data: [{ id: "p2" }] } },
  ]);
  const seeded = await newAccount.poll!(input, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(two.calls[1].url.includes("&after=CUR"), true);
  const more = (n: number) => ({
    body: { data: [{ id: `p${n}` }], paging: { cursors: { after: `C${n}` }, next: "https://x" } },
  });
  let err = "";
  try {
    await newAccount.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([more(1), more(2), more(3), more(4), more(5)]).ctx,
    );
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("more than 500 Pages"), true);
});
