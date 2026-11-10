import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newRepository from "../../triggers/new-repository.ts";
import newOrUpdatedRepository from "../../triggers/new-or-updated-repository.ts";
import newWorkspace from "../../triggers/new-workspace.ts";

const R = "https://api.bitbucket.org/2.0";
const params = { workspace: "teamsinspace" };
const input = { params, subscriptionId: "s" };
const repo = (uuid: string, updated = "2026-11-10T09:00:00Z") => ({
  uuid,
  full_name: `teamsinspace/${uuid}`,
  updated_on: updated,
});
const page = (values: unknown[], next?: string) => ({
  body: { values, pagelen: 100, ...(next ? { next } : {}) },
});

// ---- new-repository: newest first (sort=-created_on) ---------------------------------------------
test("new-repository: seed emits nothing, then only the new repository, idempotently", async () => {
  const seeded = await newRepository.poll!(
    { ...input, state: {} },
    mockCtx([page([repo("a")])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = () =>
    newRepository.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page([repo("b"), repo("a")])]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [repo("b")]);
  assertEquals(await run(), first);
});

test("new-repository: literal request is the list action sorted newest-created first", async () => {
  const mock = mockCtx([page([repo("a")])]);
  await newRepository.poll!({ ...input, state: {} }, mock.ctx);
  assertEquals(mock.calls.length, 1);
  assertEquals(mock.calls[0].method, "GET");
  assertEquals(mock.calls[0].url, `${R}/repositories/teamsinspace?sort=-created_on&pagelen=100`);
});

// ---- new-or-updated-repository: sort=-updated_on, id = uuid:updated_on ---------------------------
test("new-or-updated-repository: an edit of a known repository is a new event; literal request", async () => {
  const seed = mockCtx([page([repo("a", "t1")])]);
  const seeded = await newOrUpdatedRepository.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].url, `${R}/repositories/teamsinspace?sort=-updated_on&pagelen=100`);
  const run = () =>
    newOrUpdatedRepository.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page([repo("a", "t2")])]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [repo("a", "t2")]);
  assertEquals(await run(), first);
  const again = await newOrUpdatedRepository.poll!(
    { ...input, state: first.nextState },
    mockCtx([page([repo("a", "t2")])]).ctx,
  );
  assertEquals(again.events, []);
});

test("repository polls refuse a missing workspace before any request", async () => {
  for (const t of [newRepository, newOrUpdatedRepository]) {
    const mock = mockCtx();
    let message = "";
    try {
      await t.poll!({ params: {}, subscriptionId: "s", state: {} }, mock.ctx);
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(message.includes("Workspace is required"), true);
    assertEquals(mock.calls.length, 0);
  }
});

// ---- new-workspace: bounded snapshot over /user/workspaces ----------------------------------------
const ws = (uuid: string) => ({
  type: "workspace_access",
  administrator: false,
  workspace: { type: "workspace", uuid, slug: uuid },
});
test("new-workspace: seeds, emits the added workspace only, idempotent, literal request", async () => {
  const seed = mockCtx([page([ws("a")])]);
  const seeded = await newWorkspace.poll!({ params: {}, subscriptionId: "s", state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${R}/user/workspaces?page=1&pagelen=100`);
  const run = () =>
    newWorkspace.poll!(
      { params: {}, subscriptionId: "s", state: seeded.nextState },
      mockCtx([page([ws("a"), ws("b")])]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [ws("b")]);
  assertEquals(await run(), first);
});

test("new-workspace: follows next links and fails loudly past 50 pages", async () => {
  const two = mockCtx([page([ws("a")], `${R}/user/workspaces?page=2`), page([ws("b")])]);
  await newWorkspace.poll!({ params: {}, subscriptionId: "s", state: {} }, two.ctx);
  assertEquals(two.calls.map((c) => c.url), [
    `${R}/user/workspaces?page=1&pagelen=100`,
    `${R}/user/workspaces?page=2&pagelen=100`,
  ]);
  const many = mockCtx(Array.from({ length: 50 }, (_, i) => page([ws(`w${i}`)], "more")));
  let message = "";
  try {
    await newWorkspace.poll!({ params: {}, subscriptionId: "s", state: {} }, many.ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("more than 5000 workspaces"), true);
});

test("new-workspace: a user in two workspaces seeds fine and a third is emitted (vendor workspace_access shape)", async () => {
  const seed = await newWorkspace.poll!(
    { params: {}, subscriptionId: "s", state: {} },
    mockCtx([page([ws("a"), ws("b")])]).ctx,
  );
  assertEquals(seed.events, []);
  const next = await newWorkspace.poll!(
    { params: {}, subscriptionId: "s", state: seed.nextState },
    mockCtx([page([ws("a"), ws("b"), ws("c")])]).ctx,
  );
  assertEquals(next.events, [ws("c")]);
});

test("new-workspace: an item with no workspace uuid is refused, not keyed to an empty string", async () => {
  let message = "";
  try {
    await newWorkspace.poll!(
      { params: {}, subscriptionId: "s", state: {} },
      mockCtx([page([{ type: "workspace_access", administrator: true }])]).ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("without a uuid"), true);
});
