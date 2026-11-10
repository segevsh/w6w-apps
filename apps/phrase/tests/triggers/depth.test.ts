import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newKey from "../../triggers/new-key.ts";
import newOrUpdatedKey from "../../triggers/new-or-updated-key.ts";
import newTranslation from "../../triggers/new-translation.ts";
import newOrUpdatedTranslation from "../../triggers/new-or-updated-translation.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";
import newProject from "../../triggers/new-project.ts";
import newAccount from "../../triggers/new-account.ts";
import newLocale from "../../triggers/new-locale.ts";
import newTag from "../../triggers/new-tag.ts";

const V2 = "https://api.phrase.com/v2";
type Trig = {
  poll?: (i: never, c: never) => Promise<{ events: unknown[]; nextState: unknown }>;
};
const poll = (t: unknown, params: unknown, state: unknown, c: unknown) =>
  (t as Trig).poll!({ params, state, subscriptionId: "sub" } as never, c as never);
const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded?: boolean }).seeded;
const rows = (field: string, ...vals: string[]) => ({ body: vals.map((v) => ({ [field]: v })) });
const P = { projectId: "p1" };

const sorted = [
  {
    name: "new-key",
    t: newKey,
    params: P,
    url: `${V2}/projects/p1/keys?sort=created_at&order=desc&page=1&per_page=100`,
    ids: ["b", "a"],
    events: [{ id: "b" }],
  },
  {
    name: "new-translation",
    t: newTranslation,
    params: P,
    url: `${V2}/projects/p1/translations?sort=created_at&order=desc&page=1&per_page=100`,
    ids: ["b", "a"],
    events: [{ id: "b" }],
  },
];

for (const c of sorted) {
  test(`${c.name}: seeds, emits the new record, retries idempotently, requests created_at desc`, async () => {
    const seed = mockCtx([rows("id", "a")]);
    const seeded = await poll(c.t, c.params, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const first = await poll(c.t, c.params, seeded.nextState, mockCtx([rows("id", ...c.ids)]).ctx);
    const retry = await poll(c.t, c.params, seeded.nextState, mockCtx([rows("id", ...c.ids)]).ctx);
    assertEquals(first.events, c.events);
    assertEquals(retry, first);
  });
}

const updated = [
  {
    name: "new-or-updated-key",
    t: newOrUpdatedKey,
    params: P,
    url: `${V2}/projects/p1/keys?sort=updated_at&order=desc&page=1&per_page=100`,
  },
  {
    name: "new-or-updated-translation",
    t: newOrUpdatedTranslation,
    params: P,
    url: `${V2}/projects/p1/translations?sort=updated_at&order=desc&page=1&per_page=100`,
  },
  {
    name: "new-or-updated-project",
    t: newOrUpdatedProject,
    params: {},
    url: `${V2}/projects?sort_by=updated_at_desc&page=1&per_page=100`,
  },
];

for (const c of updated) {
  test(`${c.name}: an edited record is a new event; retry is idempotent; requests updated_at desc`, async () => {
    const at = (id: string, u: string) => ({ id, updated_at: u });
    const seed = mockCtx([{ body: [at("a", "2026-11-10T09:00:00Z")] }]);
    const seeded = await poll(c.t, c.params, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const page = [at("a", "2026-11-10T09:30:00Z"), at("b", "2026-11-10T09:20:00Z")];
    const run = () => poll(c.t, c.params, seeded.nextState, mockCtx([{ body: page }]).ctx);
    const first = await run();
    assertEquals(first.events, [page[1], page[0]]);
    assertEquals(await run(), first);
    const again = await poll(c.t, c.params, first.nextState, mockCtx([{ body: page }]).ctx);
    assertEquals(again.events, []);
  });
}

const snapshots = [
  {
    name: "new-project",
    t: newProject,
    params: {},
    url: `${V2}/projects?page=1&per_page=100`,
    field: "id",
  },
  {
    name: "new-account",
    t: newAccount,
    params: {},
    url: `${V2}/accounts?page=1&per_page=100`,
    field: "id",
  },
  {
    name: "new-locale",
    t: newLocale,
    params: P,
    url: `${V2}/projects/p1/locales?page=1&per_page=100`,
    field: "id",
  },
  {
    name: "new-tag",
    t: newTag,
    params: P,
    url: `${V2}/projects/p1/tags?page=1&per_page=100`,
    field: "name",
  },
];

for (const c of snapshots) {
  test(`${c.name}: seeds, emits only a newly added record, retries, requests the literal URL`, async () => {
    const seed = mockCtx([rows(c.field, "a")]);
    const seeded = await poll(c.t, c.params, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const first = await poll(
      c.t,
      c.params,
      seeded.nextState,
      mockCtx([rows(c.field, "a", "b")]).ctx,
    );
    const retry = await poll(
      c.t,
      c.params,
      seeded.nextState,
      mockCtx([rows(c.field, "a", "b")]).ctx,
    );
    assertEquals(first.events, [{ [c.field]: "b" }]);
    assertEquals(retry, first);
  });
}

test("snapshot triggers follow the next page and refuse a list past the page cap", async () => {
  const more = (n: number, id: string) => ({
    body: [{ id }],
    headers: { pagination: JSON.stringify({ next_page: n + 1 }) },
  });
  const two = mockCtx([more(1, "a"), rows("id", "b")]);
  const seeded = await poll(newProject, {}, {}, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(two.calls[1].url, `${V2}/projects?page=2&per_page=100`);
  let err = "";
  try {
    await poll(
      newProject,
      {},
      seeded.nextState,
      mockCtx([more(1, "a"), more(2, "b"), more(3, "c"), more(4, "d"), more(5, "e")]).ctx,
    );
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("too large to snapshot"), true);
});
