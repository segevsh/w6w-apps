import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, odataList } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newClient from "../../triggers/new-client.ts";
import newLocation from "../../triggers/new-location.ts";
import newGroup from "../../triggers/new-group.ts";
import newMember from "../../triggers/new-member.ts";
import newOrUpdatedMember from "../../triggers/new-or-updated-member.ts";
import newTimeEntry from "../../triggers/new-time-entry.ts";
import newOrUpdatedTimeEntry from "../../triggers/new-or-updated-time-entry.ts";
import newTimeOffRequest from "../../triggers/new-time-off-request.ts";

const WS = "https://workspace.prod.jibble.io/v1";
const TT = "https://time-tracking.prod.jibble.io/v1";

// One row per newest-first trigger: the LITERAL request (OData `$orderby`, `$top`, `$skip`).
const feeds = [
  {
    name: "new-project",
    trigger: newProject,
    url: `${WS}/Projects?%24orderby=createdAt+desc&%24top=100&%24skip=0`,
  },
  {
    name: "new-client",
    trigger: newClient,
    url: `${WS}/Clients?%24orderby=createdAt+desc&%24top=100&%24skip=0`,
  },
  {
    name: "new-location",
    trigger: newLocation,
    url: `${WS}/Locations?%24orderby=createdAt+desc&%24top=100&%24skip=0`,
  },
  {
    name: "new-group",
    trigger: newGroup,
    url: `${WS}/Groups?%24orderby=createdAt+desc&%24top=100&%24skip=0`,
  },
  {
    name: "new-member",
    trigger: newMember,
    url: `${WS}/People?%24orderby=createdAt+desc&%24top=100&%24skip=0`,
  },
  {
    name: "new-time-entry",
    trigger: newTimeEntry,
    url: `${TT}/TimeEntries?%24orderby=createdAt+desc&%24top=100&%24skip=0`,
  },
];
const revisions = [
  {
    name: "new-or-updated-member",
    trigger: newOrUpdatedMember,
    url: `${WS}/People?%24orderby=updatedAt+desc&%24top=100&%24skip=0`,
  },
  {
    name: "new-or-updated-time-entry",
    trigger: newOrUpdatedTimeEntry,
    url: `${TT}/TimeEntries?%24orderby=updatedAt+desc&%24top=100&%24skip=0`,
  },
];

const page = (...rows: Array<Record<string, unknown>>) => mockCtx([{ body: odataList(rows) }]);
const at = (state: unknown) => ({ params: {}, state }) as never;

for (const { name, trigger, url } of feeds) {
  test(`${name}: seeds, emits only the new record, retries identically, sends its literal request`, async () => {
    const old = { id: "old" }, fresh = { id: "fresh" };
    const seed = page(old);
    const seeded = await trigger.poll!(at({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const first = await trigger.poll!(at(seeded.nextState), page(fresh, old).ctx);
    const retry = await trigger.poll!(at(seeded.nextState), page(fresh, old).ctx);
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
  });
}

for (const { name, trigger, url } of revisions) {
  test(`${name}: an edited record is a new event; literal request`, async () => {
    const v1 = { id: "a", updatedAt: "2026-11-09T09:00:00Z" };
    const v2 = { id: "a", updatedAt: "2026-11-10T09:00:00Z" };
    const seed = page(v1);
    const seeded = await trigger.poll!(at({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].url, url);
    const same = await trigger.poll!(at(seeded.nextState), page(v1).ctx);
    assertEquals(same.events, []);
    const edited = await trigger.poll!(at(seeded.nextState), page(v2, v1).ctx);
    const retry = await trigger.poll!(at(seeded.nextState), page(v2, v1).ctx);
    assertEquals(edited.events, [v2]);
    assertEquals(retry, edited);
  });
}

const today = () => new Date().toISOString().slice(0, 10);

test("new-time-off-request: snapshot of requests that have not ended, literal request", async () => {
  const a = { id: "a", status: "Pending" }, b = { id: "b", status: "Pending" };
  const seed = mockCtx([{ body: odataList([a]) }, { body: odataList([]) }]);
  const seeded = await newTimeOffRequest.poll!(at({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 2);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    `${TT}/TimeOffOverview?%24filter=endDate+ge+${today()}&%24top=100&%24skip=0`,
  );
  assertEquals(
    seed.calls[1].url,
    `${TT}/TimeOffOverview?%24filter=endDate+ge+${today()}&%24top=100&%24skip=1`,
  );
  const run = () =>
    newTimeOffRequest.poll!(
      at(seeded.nextState),
      mockCtx([{ body: odataList([a, b]) }, { body: odataList([]) }]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [b]);
  assertEquals(await run(), first);
});

test("new-time-off-request: walks $skip across pages and stops at the first empty page", async () => {
  const rows = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `r${from + i}` }));
  const m = mockCtx([
    { body: odataList(rows(0, 100)) },
    { body: odataList(rows(100, 40)) },
    { body: odataList([]) },
  ]);
  const out = await newTimeOffRequest.poll!(at({}), m.ctx);
  assertEquals(out.events, []);
  assertEquals(m.calls.map((c) => new URL(c.url).searchParams.get("$skip")), ["0", "100", "140"]);
  assertEquals(Object.keys((out.nextState as { hashes: object }).hashes).length, 140);
});

test("new-time-off-request: refuses a list longer than the 5000-row cap", async () => {
  const responses = Array.from({ length: 50 }, (_, i) => ({ body: odataList([{ id: `r${i}` }]) }));
  await assertRejects(
    () => newTimeOffRequest.poll!(at({}), mockCtx(responses).ctx),
    Error,
    "5000",
  );
});
