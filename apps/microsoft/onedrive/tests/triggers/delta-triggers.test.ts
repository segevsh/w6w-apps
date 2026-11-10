import { afterEach, describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newFile from "../../triggers/new-file.ts";
import newFolder from "../../triggers/new-folder.ts";
import fileUpdated from "../../triggers/file-updated.ts";
import folderUpdated from "../../triggers/folder-updated.ts";
import itemDeleted from "../../triggers/item-deleted.ts";

const DELTA = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=cursor";
const NEXT = "https://graph.microsoft.com/v1.0/me/drive/root/delta?skiptoken=page-2";
const FRESH = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=fresh";

// The seed instant, then a later check. Item stamps below are relative to T0.
const T0 = Date.parse("2026-11-10T10:00:00Z");
const T1 = T0 + 5 * 60_000;
const T2 = T0 + 10 * 60_000;

// Every delta request asks Graph to leave out the ancestors of each changed item
// (the `deltaExcludeParent` header; the test helper lower-cases header names).
const EXCLUDE_PARENTS = { deltaexcludeparent: "true" };

const OLD = "2026-11-01T08:00:00Z"; // created long before the seed
const FRESH_AT = "2026-11-10T10:03:00Z"; // created after the seed

const seeded = (over: Record<string, unknown> = {}) => ({
  v: 1 as const,
  kind: "token" as const,
  seeded: true as const,
  token: DELTA,
  floor: T0,
  since: T0,
  seen: [] as string[],
  ...over,
});

const input = (state: unknown, params: Record<string, unknown> = {}) => ({
  params,
  state,
  subscriptionId: "sub",
});

/** One page of a delta round holding every kind of item the classifier has to tell apart. */
const page = {
  value: [
    {
      id: "file-new",
      name: "New.docx",
      createdDateTime: FRESH_AT,
      file: {},
      parentReference: { id: "P1" },
    },
    {
      id: "file-old",
      name: "Old.docx",
      createdDateTime: OLD,
      file: {},
      parentReference: { id: "P2" },
    },
    {
      id: "folder-new",
      name: "NewDir",
      createdDateTime: FRESH_AT,
      folder: {},
      parentReference: { id: "P1" },
    },
    {
      id: "folder-old",
      name: "OldDir",
      createdDateTime: OLD,
      folder: {},
      parentReference: { id: "P2" },
    },
    { id: "gone", deleted: { state: "deleted" }, parentReference: { id: "P1" } },
    { id: "root", createdDateTime: OLD, folder: {}, root: {} },
  ],
  "@odata.deltaLink": DELTA,
};

// trigger, the one item of `page` it must emit
const CASES = [
  { trigger: newFile, expected: "file-new" },
  { trigger: newFolder, expected: "folder-new" },
  { trigger: fileUpdated, expected: "file-old" },
  { trigger: folderUpdated, expected: "folder-old" },
  { trigger: itemDeleted, expected: "gone" },
];

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

for (const { trigger, expected } of CASES) {
  describe(trigger.key, () => {
    test("seeds from token=latest without emitting and records the seed instant", async () => {
      clock.now = () => T0;
      const { ctx, calls } = mockCtx([{
        body: { value: [page.value[0]], "@odata.deltaLink": DELTA },
      }]);
      const r = await trigger.poll!(input({}), ctx);
      assertEquals(r.events, []);
      assertEquals(r.nextState, seeded());
      assertEquals(calls[0], {
        method: "GET",
        url: "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=latest&%24top=999",
        headers: EXCLUDE_PARENTS,
        body: null,
      });
    });

    test("emits exactly the one matching item of a mixed delta page", async () => {
      clock.now = () => T1;
      const { ctx, calls } = mockCtx([{ body: page }]);
      const r = await trigger.poll!(input(seeded()), ctx);
      assertEquals((r.events as Array<{ id: string }>).map((e) => e.id), [expected]);
      assertEquals(r.nextState?.token, DELTA);
      assertEquals(calls[0], { method: "GET", url: DELTA, headers: EXCLUDE_PARENTS, body: null });
    });

    test("the same state and response give the same result", async () => {
      clock.now = () => T1;
      const one = await trigger.poll!(input(seeded()), mockCtx([{ body: page }]).ctx);
      const two = await trigger.poll!(input(seeded()), mockCtx([{ body: page }]).ctx);
      assertEquals(one, two);
    });

    test("an unrecognised cursor shape is treated as unseeded (no events)", async () => {
      clock.now = () => T1;
      const legacy = { v: 1, kind: "token", seeded: true, token: DELTA };
      const { ctx } = mockCtx([{ body: { value: page.value, "@odata.deltaLink": FRESH } }]);
      const r = await trigger.poll!(input(legacy), ctx);
      assertEquals(r.events, []);
      assertEquals(r.nextState, seeded({ token: FRESH, floor: T1, since: T1 }));
    });

    test("reseeds without emitting when Graph expires the delta cursor (410)", async () => {
      clock.now = () => T2;
      const { ctx } = mockCtx([
        { status: 410, statusText: "Gone", body: { error: { code: "resyncRequired" } } },
        { body: { value: [], "@odata.deltaLink": FRESH } },
      ]);
      const r = await trigger.poll!(input(seeded()), ctx);
      assertEquals(r.events, []);
      assertEquals(r.nextState, seeded({ token: FRESH, floor: T2, since: T2 }));
    });
  });
}

describe("new-file: created classification", () => {
  test("an item created before the seed is never 'created', however often it is modified", async () => {
    clock.now = () => T1;
    const { ctx } = mockCtx([{ body: { value: [page.value[1]], "@odata.deltaLink": DELTA } }]);
    const r = await newFile.poll!(input(seeded()), ctx);
    assertEquals(r.events, []);
  });

  test("an id already emitted as created is not emitted again when it reappears in the overlap", async () => {
    // Created 30 s before the first check; the check after it still sees it as 'created'
    // because its window starts 60 s before the previous round (10:04).
    const late = {
      value: [{ id: "file-late", createdDateTime: "2026-11-10T10:04:30Z", file: {} }],
      "@odata.deltaLink": DELTA,
    };
    clock.now = () => T1;
    const first = await newFile.poll!(input(seeded()), mockCtx([{ body: late }]).ctx);
    assertEquals((first.events as Array<{ id: string }>).map((e) => e.id), ["file-late"]);
    assertEquals(first.nextState?.since, T1);
    clock.now = () => T2;
    const again = await newFile.poll!(input(first.nextState), mockCtx([{ body: late }]).ctx);
    assertEquals(again.events, []);
  });

  test("folderId keeps only items directly inside that folder", async () => {
    clock.now = () => T1;
    const mixed = {
      value: [
        { id: "in", createdDateTime: FRESH_AT, file: {}, parentReference: { id: "P1" } },
        { id: "elsewhere", createdDateTime: FRESH_AT, file: {}, parentReference: { id: "P2" } },
        { id: "no-parent", createdDateTime: FRESH_AT, file: {} },
      ],
      "@odata.deltaLink": DELTA,
    };
    const r = await newFile.poll!(
      input(seeded(), { folderId: "P1" }),
      mockCtx([{ body: mixed }]).ctx,
    );
    assertEquals((r.events as Array<{ id: string }>).map((e) => e.id), ["in"]);
  });

  test("a non-default driveId is addressed as /drives/{id}", async () => {
    clock.now = () => T0;
    const { ctx, calls } = mockCtx([{ body: { value: [], "@odata.deltaLink": DELTA } }]);
    await newFile.poll!(input({}, { driveId: "b!sample-drive" }), ctx);
    assertEquals(
      calls[0].url,
      "https://graph.microsoft.com/v1.0/drives/b!sample-drive/root/delta?token=latest&%24top=999",
    );
  });

  test("the created window follows the previous complete round, less 60 s of skew", async () => {
    clock.now = () => T2;
    // since = T1 (10:05) -> window starts 10:04; floor 10:00 is older so the window wins.
    const state = seeded({ token: DELTA, since: T1 });
    const body = {
      value: [
        { id: "after-window", createdDateTime: "2026-11-10T10:04:30Z", file: {} },
        { id: "before-window", createdDateTime: "2026-11-10T10:03:00Z", file: {} },
      ],
      "@odata.deltaLink": DELTA,
    };
    const created = await newFile.poll!(input(state), mockCtx([{ body }]).ctx);
    assertEquals((created.events as Array<{ id: string }>).map((e) => e.id), ["after-window"]);
    const updated = await fileUpdated.poll!(input(state), mockCtx([{ body }]).ctx);
    // "updated" has no skew overlap (it starts at `since`, 10:05): both predate it, so a file
    // created inside the created-overlap is still reported when it is edited (B3).
    assertEquals((updated.events as Array<{ id: string }>).map((e) => e.id), [
      "after-window",
      "before-window",
    ]);
  });
});

describe("delta round tracking", () => {
  test("a mid-round page keeps `since`, remembers the round start, and a later page completes it", async () => {
    clock.now = () => T1;
    const midRound = { value: [page.value[0]], "@odata.nextLink": NEXT };
    const one = await newFile.poll!(input(seeded()), mockCtx([{ body: midRound }]).ctx);
    assertEquals((one.events as Array<{ id: string }>).map((e) => e.id), ["file-new"]);
    assertEquals(
      one.nextState,
      seeded({ token: NEXT, since: T0, roundStart: T1, seen: ["file-new"] }),
    );

    // The next check is later, but the round began at T1 and `since` stays at T0 until it ends.
    clock.now = () => T2;
    const last = {
      value: [{ id: "file-late", createdDateTime: "2026-11-10T10:04:00Z", file: {} }],
      "@odata.deltaLink": DELTA,
    };
    const { ctx, calls } = mockCtx([{ body: last }]);
    const two = await newFile.poll!(input(one.nextState), ctx);
    assertEquals((two.events as Array<{ id: string }>).map((e) => e.id), ["file-late"]);
    assertEquals(calls[0].url, NEXT);
    assertEquals(
      two.nextState,
      seeded({ token: DELTA, since: T1, seen: ["file-new", "file-late"] }),
    );
  });

  test("a delta response with neither link is an error, not a silent stall", async () => {
    clock.now = () => T1;
    const { ctx } = mockCtx([{ body: { value: [] } }]);
    await assertRejects(
      () => newFile.poll!(input(seeded()), ctx) as Promise<unknown>,
      Error,
      "delta link",
    );
  });

  test("a non-410 failure propagates", async () => {
    clock.now = () => T1;
    const { ctx } = mockCtx([{ status: 500, statusText: "Server Error", body: { error: {} } }]);
    await assertRejects(
      () => newFile.poll!(input(seeded()), ctx) as Promise<unknown>,
      Error,
      "500",
    );
  });
});

const ids = (r: { events: unknown[] }) => (r.events as Array<{ id: string }>).map((e) => e.id);

describe("an item Graph repeats is delivered once (last occurrence wins)", () => {
  const twice = (id: string, extra: Record<string, unknown>) => [
    { id, createdDateTime: OLD, lastModifiedDateTime: "2026-11-10T10:01:00Z", ...extra },
    { id, createdDateTime: OLD, lastModifiedDateTime: "2026-11-10T10:02:00Z", ...extra },
  ];
  const REPEATS = [
    { trigger: fileUpdated, id: "dup-file", items: twice("dup-file", { file: {} }) },
    { trigger: folderUpdated, id: "dup-folder", items: twice("dup-folder", { folder: {} }) },
    { trigger: itemDeleted, id: "dup-gone", items: twice("dup-gone", { deleted: {} }) },
    {
      trigger: newFile,
      id: "dup-new",
      items: twice("dup-new", { file: {}, createdDateTime: FRESH_AT }),
    },
  ];
  for (const { trigger, id, items } of REPEATS) {
    test(`${trigger.key}: the same id twice in a page gives one event`, async () => {
      clock.now = () => T1;
      const body = { value: items, "@odata.deltaLink": DELTA };
      const r = await trigger.poll!(input(seeded()), mockCtx([{ body }]).ctx);
      assertEquals(ids(r), [id]);
    });
  }

  test("the last occurrence decides: updated then deleted is not an update", async () => {
    clock.now = () => T1;
    const body = {
      value: [
        { id: "x", createdDateTime: OLD, file: {} },
        { id: "x", deleted: { state: "deleted" } },
      ],
      "@odata.deltaLink": DELTA,
    };
    assertEquals(ids(await fileUpdated.poll!(input(seeded()), mockCtx([{ body }]).ctx)), []);
    assertEquals(ids(await itemDeleted.poll!(input(seeded()), mockCtx([{ body }]).ctx)), ["x"]);
  });

  test("an id on page 1 and again on page 2 of one round fires at the first check only", async () => {
    const item = { id: "again", createdDateTime: OLD, file: {} };
    clock.now = () => T1;
    const one = await fileUpdated.poll!(
      input(seeded()),
      mockCtx([{ body: { value: [item], "@odata.nextLink": NEXT } }]).ctx,
    );
    assertEquals(ids(one), ["again"]);
    assertEquals(one.nextState?.roundEmitted, ["again"]);
    clock.now = () => T2;
    const two = await fileUpdated.poll!(
      input(one.nextState),
      mockCtx([{ body: { value: [item, { ...item, id: "other" }], "@odata.deltaLink": DELTA } }])
        .ctx,
    );
    assertEquals(ids(two), ["other"]);
    assertEquals(two.nextState?.roundEmitted, undefined);
  });

  test("a real second edit in a later round fires again", async () => {
    const item = { id: "again", createdDateTime: OLD, file: {} };
    const body = { value: [item], "@odata.deltaLink": DELTA };
    clock.now = () => T1;
    const one = await fileUpdated.poll!(input(seeded()), mockCtx([{ body }]).ctx);
    clock.now = () => T2;
    const two = await fileUpdated.poll!(input(one.nextState), mockCtx([{ body }]).ctx);
    assertEquals(ids(one), ["again"]);
    assertEquals(ids(two), ["again"]);
  });
});

describe("a file edited in the interval after its creation is not lost", () => {
  // Created at 10:04:30, 30 s before the check at T1 (10:05): new-file emits it at T1.
  const CREATED = "2026-11-10T10:04:30Z";
  const file = (extra: Record<string, unknown> = {}) => ({
    value: [{ id: "doc", createdDateTime: CREATED, file: {}, ...extra }],
    "@odata.deltaLink": DELTA,
  });

  test("created 30 s before a check, edited in the next round: file-updated once, new-file not repeated", async () => {
    clock.now = () => T1;
    const nf = await newFile.poll!(input(seeded()), mockCtx([{ body: file() }]).ctx);
    const fu = await fileUpdated.poll!(input(seeded()), mockCtx([{ body: file() }]).ctx);
    assertEquals(ids(nf), ["doc"]);
    assertEquals(ids(fu), []);

    clock.now = () => T2;
    const edited = file({ lastModifiedDateTime: "2026-11-10T10:07:00Z" });
    const nf2 = await newFile.poll!(input(nf.nextState), mockCtx([{ body: edited }]).ctx);
    const fu2 = await fileUpdated.poll!(input(fu.nextState), mockCtx([{ body: edited }]).ctx);
    assertEquals(ids(nf2), []);
    assertEquals(ids(fu2), ["doc"]);
  });

  test("the pre-seed floor still holds: a file created 30 s before the seed is updated, never created", async () => {
    // seed at T0 (10:00); file created at 09:59:30 and modified afterwards.
    const pre = {
      value: [{ id: "pre", createdDateTime: "2026-11-10T09:59:30Z", file: {} }],
      "@odata.deltaLink": DELTA,
    };
    clock.now = () => T1;
    assertEquals(ids(await newFile.poll!(input(seeded()), mockCtx([{ body: pre }]).ctx)), []);
    assertEquals(ids(await fileUpdated.poll!(input(seeded()), mockCtx([{ body: pre }]).ctx)), [
      "pre",
    ]);
  });
});

describe("trigger shapes", () => {
  test("every delta trigger declares output and sample, and a poll interval", () => {
    for (const { trigger } of CASES) {
      assertEquals(trigger.output.length > 0, true);
      assertEquals(trigger.sample !== undefined, true);
      assertEquals(typeof trigger.poll, "function");
      assertEquals(trigger.onSubscribe, undefined);
    }
  });

  test("item-deleted offers no folder filter", () => {
    assertEquals(itemDeleted.params!.map((p) => p.key), ["driveId"]);
    assertEquals(newFile.params!.map((p) => p.key), ["driveId", "folderId"]);
  });
});
