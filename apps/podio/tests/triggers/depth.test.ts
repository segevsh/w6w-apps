import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newItem from "../../triggers/new-item.ts";
import newOrUpdatedItem from "../../triggers/new-or-updated-item.ts";
import newComment from "../../triggers/new-comment.ts";
import newApp from "../../triggers/new-app.ts";
import newSpace from "../../triggers/new-space.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newSearchHit from "../../triggers/new-search-hit.ts";

const API = "https://api.podio.com";
const sub = { subscriptionId: "sub-1" };
const ok = (body: unknown) => mockCtx([{ body }]);

// --- items -----------------------------------------------------------------------------------
test("new-item: seeds, emits the new item, retries idempotently, literal created_on desc request", async () => {
  const params = { appId: "31001" };
  const seed = ok({ total: 1, filtered: 1, items: [{ item_id: 1 }] });
  const seeded = await newItem.poll!({ ...sub, params, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, `${API}/item/app/31001/filter/`);
  assertEquals(
    JSON.parse(seed.calls[0].body!),
    { sort_by: "created_on", sort_desc: true, limit: 100, offset: 0 },
  );
  const page = { items: [{ item_id: 2 }, { item_id: 1 }] };
  const first = await newItem.poll!(
    { ...sub, params, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  const retry = await newItem.poll!(
    { ...sub, params, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(first.events, [{ item_id: 2 }]);
  assertEquals(retry, first);
});

test("new-or-updated-item: an edited item fires again once; stamped by current_revision.created_on; literal last_edit_on desc request", async () => {
  const params = { appId: "31001" };
  const it = (id: number, at: string, revision = 1) => ({
    item_id: id,
    created_on: "2026-11-01 08:00:00",
    last_event_on: "2026-11-10 12:00:00",
    current_revision: { revision, created_on: at },
  });
  const seed = ok({ items: [it(1, "2026-11-10 08:00:00"), it(2, "2026-11-09 08:00:00")] });
  const seeded = await newOrUpdatedItem.poll!({ ...sub, params, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].url, `${API}/item/app/31001/filter/`);
  assertEquals(
    JSON.parse(seed.calls[0].body!),
    { sort_by: "last_edit_on", sort_desc: true, limit: 100, offset: 0 },
  );
  const page = { items: [it(2, "2026-11-10 09:00:00", 2), it(1, "2026-11-10 08:00:00")] };
  const first = await newOrUpdatedItem.poll!(
    { ...sub, params, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(first.events, [it(2, "2026-11-10 09:00:00", 2)]);
  assertEquals(
    await newOrUpdatedItem.poll!(
      { ...sub, params, state: seeded.nextState } as never,
      ok(page).ctx,
    ),
    first,
  );
  const again = await newOrUpdatedItem.poll!(
    { ...sub, params, state: first.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(again.events, []);
});

// --- comments (oldest first, offset paging) ----------------------------------------------------
const cm = (id: number) => ({ comment_id: id });
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => cm(a + i));
const cparams = { refType: "item", refId: "4012345" };

test("new-comment: seed reads the whole thread without emitting; the next check emits only new comments", async () => {
  const seed = ok([cm(1), cm(2)]);
  const seeded = await newComment.poll!({ ...sub, params: cparams, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${API}/comment/item/4012345/?limit=100&offset=0`);
  const reply = [{ body: [cm(2), cm(3), cm(4)] }];
  const m = mockCtx(reply);
  const out = await newComment.poll!(
    { ...sub, params: cparams, state: seeded.nextState } as never,
    m.ctx,
  );
  assertEquals(out.events, [cm(3), cm(4)]);
  assertEquals(m.calls[0].url, `${API}/comment/item/4012345/?limit=100&offset=1`);
  const retry = await newComment.poll!(
    { ...sub, params: cparams, state: seeded.nextState } as never,
    mockCtx(reply).ctx,
  );
  assertEquals(retry, out);
  const quiet = await newComment.poll!(
    { ...sub, params: cparams, state: out.nextState } as never,
    mockCtx([{ body: [cm(4)] }]).ctx,
  );
  assertEquals(quiet.events, []);
});

test("new-comment: a burst longer than one page resumes at the saved offset, none twice", async () => {
  const seeded = await newComment.poll!(
    { ...sub, params: cparams, state: {} } as never,
    ok([cm(1)]).ctx,
  );
  const m1 = mockCtx([{ body: range(1, 100) }]); // offset 0: overlap cm(1) + 99 new
  const r1 = await newComment.poll!(
    { ...sub, params: cparams, state: seeded.nextState } as never,
    m1.ctx,
  );
  const m2 = mockCtx([{ body: range(100, 150) }]);
  const r2 = await newComment.poll!(
    { ...sub, params: cparams, state: r1.nextState } as never,
    m2.ctx,
  );
  assertEquals(r1.events, range(2, 100));
  assertEquals(r2.events, range(101, 150));
  assertEquals(m1.calls[0].url, `${API}/comment/item/4012345/?limit=100&offset=0`);
  assertEquals(m2.calls[0].url, `${API}/comment/item/4012345/?limit=100&offset=99`);
});

test("new-comment: a deleted comment re-baselines instead of emitting old comments", async () => {
  const seeded = await newComment.poll!(
    { ...sub, params: cparams, state: {} } as never,
    ok([cm(1), cm(2), cm(3)]).ctx,
  );
  // comment 2 deleted: offset 2 now holds nothing / a different row
  const out = await newComment.poll!(
    { ...sub, params: cparams, state: seeded.nextState } as never,
    mockCtx([{ body: [cm(9)] }, { body: [cm(1), cm(3)] }]).ctx,
  );
  assertEquals(out.events, []);
  assertEquals(JSON.parse((out.nextState as { token: string }).token), { count: 2, lastId: "3" });
});

// --- snapshots ---------------------------------------------------------------------------------
test("new-app: seeds, emits only a newly added app, retries idempotently, literal request", async () => {
  const params = { spaceId: "5001" };
  const seed = ok([{ app_id: 1, status: "active" }]);
  const seeded = await newApp.poll!({ ...sub, params, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${API}/app/space/5001/`);
  const page = [{ app_id: 1, status: "inactive" }, { app_id: 2, status: "active" }];
  const first = await newApp.poll!(
    { ...sub, params, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(first.events, [{ app_id: 2, status: "active" }]);
  assertEquals(
    await newApp.poll!({ ...sub, params, state: seeded.nextState } as never, ok(page).ctx),
    first,
  );
});

test("new-space: seeds, emits only a newly added workspace, literal request", async () => {
  const params = { orgId: "21" };
  const seed = ok([{ space_id: 1 }]);
  const seeded = await newSpace.poll!({ ...sub, params, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].url, `${API}/org/21/space/`);
  const page = [{ space_id: 1 }, { space_id: 2 }];
  const first = await newSpace.poll!(
    { ...sub, params, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(first.events, [{ space_id: 2 }]);
  assertEquals(
    await newSpace.poll!({ ...sub, params, state: seeded.nextState } as never, ok(page).ctx),
    first,
  );
});

test("new-organization: seeds, emits only a newly joined organization, literal request", async () => {
  const seed = ok([{ org_id: 1 }]);
  const seeded = await newOrganization.poll!({ ...sub, params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].url, `${API}/org/`);
  const page = [{ org_id: 1 }, { org_id: 2 }];
  const first = await newOrganization.poll!(
    { ...sub, params: {}, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(first.events, [{ org_id: 2 }]);
  assertEquals(
    await newOrganization.poll!(
      { ...sub, params: {}, state: seeded.nextState } as never,
      ok(page).ctx,
    ),
    first,
  );
});

// --- search ------------------------------------------------------------------------------------
test("new-search-hit: seeds, emits the new hit, retries idempotently, literal search request", async () => {
  const params = { spaceId: "5001", query: "renewal", refType: "item" };
  const hit = (id: number) => ({ type: "item", id, title: "t" });
  const seed = ok([hit(1)]);
  const seeded = await newSearchHit.poll!({ ...sub, params, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, `${API}/search/space/5001/`);
  assertEquals(JSON.parse(seed.calls[0].body!), {
    query: "renewal",
    limit: 20,
    offset: 0,
    ref_type: "item",
  });
  const page = [hit(2), hit(1)];
  const first = await newSearchHit.poll!(
    { ...sub, params, state: seeded.nextState } as never,
    ok(page).ctx,
  );
  assertEquals(first.events, [hit(2)]);
  assertEquals(
    await newSearchHit.poll!({ ...sub, params, state: seeded.nextState } as never, ok(page).ctx),
    first,
  );
});
