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
        headers: {},
        body: null,
      });
    });

    test("emits exactly the one matching item of a mixed delta page", async () => {
      clock.now = () => T1;
      const { ctx, calls } = mockCtx([{ body: page }]);
      const r = await trigger.poll!(input(seeded()), ctx);
      assertEquals((r.events as Array<{ id: string }>).map((e) => e.id), [expected]);
      assertEquals(r.nextState?.token, DELTA);
      assertEquals(calls[0], { method: "GET", url: DELTA, headers: {}, body: null });
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

  test("an id already emitted as created is not emitted again", async () => {
    clock.now = () => T1;
    const first = await newFile.poll!(input(seeded()), mockCtx([{ body: page }]).ctx);
    assertEquals(first.events.length, 1);
    clock.now = () => T2;
    const again = await newFile.poll!(
      input(first.nextState),
      mockCtx([{ body: page }]).ctx,
    );
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
    assertEquals((updated.events as Array<{ id: string }>).map((e) => e.id), ["before-window"]);
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
      "delta link",
    );
  });

  test("a non-410 failure propagates", async () => {
    clock.now = () => T1;
    const { ctx } = mockCtx([{ status: 500, statusText: "Server Error", body: { error: {} } }]);
    await assertRejects(() => newFile.poll!(input(seeded()), ctx) as Promise<unknown>, "500");
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
