import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-file.ts";

const oldFile = { id: "old", name: "Old", createdTime: "2026-11-09T10:00:00Z" };
const newFile = { id: "new", name: "New", createdTime: "2026-11-09T11:00:00Z" };
const poll = (state: unknown, ctx: ReturnType<typeof mockCtx>["ctx"]) =>
  trigger.poll!({ params: {}, state, subscriptionId: "sub_drive" }, ctx);

test("new-file: seeds the cursor without emitting a historical file", async () => {
  const result = await poll({}, mockCtx([{ body: { files: [oldFile] } }]).ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState?.seeded, true);
});

test("new-file: emits exactly one newly listed file", async () => {
  const seeded = await poll({}, mockCtx([{ body: { files: [oldFile] } }]).ctx);
  const result = await poll(
    seeded.nextState,
    mockCtx([{ body: { files: [newFile, oldFile] } }]).ctx,
  );
  assertEquals(result.events, [newFile]);
});

test("new-file: retries with the same state and response identically", async () => {
  const seeded = await poll({}, mockCtx([{ body: { files: [oldFile] } }]).ctx);
  const first = await poll(
    seeded.nextState,
    mockCtx([{ body: { files: [newFile, oldFile] } }]).ctx,
  );
  const second = await poll(
    seeded.nextState,
    mockCtx([{ body: { files: [newFile, oldFile] } }]).ctx,
  );
  assertEquals(first, second);
});

test("new-file: uses the literal newest-first files.list request", async () => {
  const { ctx, calls } = mockCtx([{ body: { files: [] } }]);
  await poll({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    { method: calls[0].method, path: url.pathname, query: Object.fromEntries(url.searchParams) },
    {
      method: "GET",
      path: "/drive/v3/files",
      query: {
        q: "trashed = false",
        pageSize: "100",
        orderBy: "createdTime desc",
        fields: "nextPageToken, files(*)",
        includeItemsFromAllDrives: "true",
        supportsAllDrives: "true",
        spaces: "drive",
        corpora: "user",
      },
    },
  );
});
