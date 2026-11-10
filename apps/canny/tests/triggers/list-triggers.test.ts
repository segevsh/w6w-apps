import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import new_comment from "../../triggers/new-comment.ts";
import new_vote from "../../triggers/new-vote.ts";
import new_status_change from "../../triggers/new-status-change.ts";
import new_tag from "../../triggers/new-tag.ts";
import new_category from "../../triggers/new-category.ts";
import new_changelog_entry from "../../triggers/new-changelog-entry.ts";
import new_board from "../../triggers/new-board.ts";
import new_or_updated_changelog_entry from "../../triggers/new-or-updated-changelog-entry.ts";

const input = { params: {}, subscriptionId: "sub-1" };

describe("new-comment", () => {
  const trigger = new_comment;
  const item = (id: string) => ({ id, created: "2026-11-09T09:00:00.000Z" });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { items: items, hasMore: false } }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test("sends the list action's literal request", async () => {
    const seed = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v2/comments/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100 });
  });
});

describe("new-vote", () => {
  const trigger = new_vote;
  const item = (id: string) => ({ id, created: "2026-11-09T09:00:00.000Z" });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { items: items, hasMore: false } }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test("sends the list action's literal request", async () => {
    const seed = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v2/votes/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100 });
  });
});

describe("new-status-change", () => {
  const trigger = new_status_change;
  const item = (id: string) => ({ id, created: "2026-11-09T09:00:00.000Z" });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { items: items, hasMore: false } }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test("sends the list action's literal request", async () => {
    const seed = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v2/status_changes/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100 });
  });
});

describe("new-tag", () => {
  const trigger = new_tag;
  const item = (id: string) => ({ id, created: "2026-11-09T09:00:00.000Z" });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { tags: items, hasMore: false } }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test("sends the list action's literal request", async () => {
    const seed = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v1/tags/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100 });
  });
});

describe("new-category", () => {
  const trigger = new_category;
  const item = (id: string) => ({ id, created: "2026-11-09T09:00:00.000Z" });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { categories: items, hasMore: false } }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test("sends the list action's literal request", async () => {
    const seed = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v1/categories/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100 });
  });
});

describe("new-changelog-entry", () => {
  const trigger = new_changelog_entry;
  const item = (id: string) => ({ id, created: "2026-11-09T09:00:00.000Z" });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { entries: items, hasMore: false } }]);

  test("seeds without emitting, emits only the new item, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test("sends the list action's literal request", async () => {
    const seed = ctx([item("a")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v1/entries/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100, sort: "created" });
  });
});

describe("new-or-updated-changelog-entry", () => {
  const trigger = new_or_updated_changelog_entry;
  const entry = (id: string, lastSaved: string) => ({ id, lastSaved });
  const ctx = (items: unknown[]) =>
    mockCtx([{ status: 200, body: { entries: items, hasMore: false } }]);

  test("an entry saved again after the seed is a new event, retries idempotently", async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([entry("a", "t1")]).ctx);
    assertEquals(seeded.events, []);
    const page = [entry("a", "t2"), entry("b", "t0")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [entry("b", "t0"), entry("a", "t2")]);
    assertEquals(retry, first);
  });

  test("sends the lastSaved sort in the literal request", async () => {
    const seed = ctx([entry("a", "t1")]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls[0].url, "https://canny.io/api/v1/entries/list");
    assertEquals(JSON.parse(seed.calls[0].body ?? "null"), { limit: 100, sort: "lastSaved" });
  });
});

describe("new-board", () => {
  const trigger = new_board;
  const ctx = (ids: string[]) =>
    mockCtx([{ status: 200, body: { boards: ids.map((id) => ({ id, name: id })) } }]);

  test("snapshots the board list, emits additions only, retries idempotently", async () => {
    const seed = ctx(["a"]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, "https://canny.io/api/v1/boards/list");
    const run = () => trigger.poll!({ ...input, state: seeded.nextState }, ctx(["a", "b"]).ctx);
    const first = await run();
    assertEquals(first.events.map((e) => (e as { key: string }).key), ["b"]);
    assertEquals(await run(), first);
  });
});
