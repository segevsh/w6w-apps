import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newOrUpdatedFile from "../../triggers/new-or-updated-file.ts";
import newFolder from "../../triggers/new-folder.ts";
import newOrUpdatedFolder from "../../triggers/new-or-updated-folder.ts";
import newSharedDrive from "../../triggers/new-shared-drive.ts";

type Ctx = ReturnType<typeof mockCtx>["ctx"];
const FOLDER_Q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
const LIST_QS = {
  fields: "nextPageToken, files(*)",
  includeItemsFromAllDrives: "true",
  supportsAllDrives: "true",
  spaces: "drive",
  corpora: "user",
  pageSize: "100",
};

const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, path: u.pathname, query: Object.fromEntries(u.searchParams) };
};

describe("trigger set", () => {
  test("ships the five triggers with output and sample", () => {
    assertEquals(app.triggers.map((t) => t.key), [
      "new-file",
      "new-or-updated-file",
      "new-folder",
      "new-or-updated-folder",
      "new-shared-drive",
    ]);
    for (const t of app.triggers) {
      assertEquals(t.output.length > 0 && t.sample !== undefined, true);
      assertEquals(typeof t.poll, "function");
    }
  });
});

describe("new-or-updated-file", () => {
  const a1 = { id: "a", name: "A", modifiedTime: "2026-11-09T10:00:00Z" };
  const a2 = { id: "a", name: "A", modifiedTime: "2026-11-10T10:00:00Z" }; // edited
  const b1 = { id: "b", name: "B", modifiedTime: "2026-11-10T11:00:00Z" };
  const poll = (params: Record<string, unknown>, state: unknown, ctx: Ctx) =>
    newOrUpdatedFile.poll!({ params, state, subscriptionId: "s" }, ctx);

  test("seeds without emitting; then emits the new file and the edited one, oldest first", async () => {
    const seeded = await poll({}, {}, mockCtx([{ body: { files: [a1] } }]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const r = await poll({}, seeded.nextState, mockCtx([{ body: { files: [b1, a2, a1] } }]).ctx);
    assertEquals(r.events, [a2, b1]);
  });

  test("the same state and response give the same result", async () => {
    const seeded = await poll({}, {}, mockCtx([{ body: { files: [a1] } }]).ctx);
    const x = await poll({}, seeded.nextState, mockCtx([{ body: { files: [b1, a1] } }]).ctx);
    const y = await poll({}, seeded.nextState, mockCtx([{ body: { files: [b1, a1] } }]).ctx);
    assertEquals(x, y);
  });

  test("sends the literal modifiedTime-desc files.list request", async () => {
    const m = mockCtx([{ body: { files: [] } }]);
    await poll({}, {}, m.ctx);
    assertEquals(req(m.calls[0]), {
      method: "GET",
      path: "/drive/v3/files",
      query: { ...LIST_QS, q: "trashed = false", orderBy: "modifiedTime desc" },
    });
    const f = mockCtx([{ body: { files: [] } }]);
    await poll({ q: "name contains 'x'", folderId: "F_1-a", driveId: "D1" }, {}, f.ctx);
    assertEquals(req(f.calls[0]).query, {
      ...LIST_QS,
      q: "(name contains 'x') and 'F_1-a' in parents and trashed = false",
      orderBy: "modifiedTime desc",
      driveId: "D1",
      corpora: "drive",
    });
  });

  test("the user's q is parenthesised before the folder clause, so an `or` in it cannot escape the folder", async () => {
    const m = mockCtx([{ body: { files: [] } }]);
    await poll({ q: "name contains 'a' or name contains 'b'", folderId: "F_1-a" }, {}, m.ctx);
    assertEquals(
      req(m.calls[0]).query.q,
      "(name contains 'a' or name contains 'b') and 'F_1-a' in parents and trashed = false",
    );
    const only = mockCtx([{ body: { files: [] } }]);
    await poll({ folderId: "F_1-a" }, {}, only.ctx);
    assertEquals(req(only.calls[0]).query.q, "'F_1-a' in parents and trashed = false");
  });

  test("fileId keeps only that file's changes; a bad id is refused before any request", async () => {
    const seeded = await poll({ fileId: "a" }, {}, mockCtx([{ body: { files: [a1] } }]).ctx);
    const r = await poll(
      { fileId: "a" },
      seeded.nextState,
      mockCtx([{ body: { files: [b1, a2, a1] } }]).ctx,
    );
    assertEquals(r.events, [a2]);
    const m = mockCtx();
    let failed = "";
    try {
      await poll({ fileId: "a' or '1'='1" }, {}, m.ctx);
    } catch (e) {
      failed = (e as Error).message;
    }
    assertEquals(failed, "File ID is not a Google Drive id.");
    assertEquals(m.calls.length, 0);
    let badFolder = "";
    try {
      await poll({ folderId: "x' or name contains 'y" }, {}, m.ctx);
    } catch (e) {
      badFolder = (e as Error).message;
    }
    assertEquals(badFolder, "Folder ID is not a Google Drive id.");
    assertEquals(m.calls.length, 0);
  });
});

describe("new-folder and new-or-updated-folder", () => {
  const f1 = { id: "f1", name: "One", modifiedTime: "2026-11-09T10:00:00Z" };
  const f1b = { id: "f1", name: "One", modifiedTime: "2026-11-10T10:00:00Z" };
  const f2 = { id: "f2", name: "Two", modifiedTime: "2026-11-10T11:00:00Z" };

  test("new-folder: seeds, emits only the new folder, retries identically", async () => {
    const poll = (state: unknown, ctx: Ctx) =>
      newFolder.poll!({ params: {}, state, subscriptionId: "s" }, ctx);
    const seeded = await poll({}, mockCtx([{ body: { files: [f1] } }]).ctx);
    assertEquals(seeded.events, []);
    const a = await poll(seeded.nextState, mockCtx([{ body: { files: [f2, f1] } }]).ctx);
    const b = await poll(seeded.nextState, mockCtx([{ body: { files: [f2, f1] } }]).ctx);
    assertEquals(a.events, [f2]);
    assertEquals(a, b);
  });

  test("new-folder: literal createdTime-desc request restricted to folders", async () => {
    const m = mockCtx([{ body: { files: [] } }]);
    await newFolder.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx);
    assertEquals(req(m.calls[0]), {
      method: "GET",
      path: "/drive/v3/files",
      query: { ...LIST_QS, q: FOLDER_Q, orderBy: "createdTime desc" },
    });
    const p = mockCtx([{ body: { files: [] } }]);
    await newFolder.poll!(
      { params: { parentFolderId: "P-1", driveId: "D1" }, state: {}, subscriptionId: "s" },
      p.ctx,
    );
    assertEquals(
      req(p.calls[0]).query.q,
      `mimeType = 'application/vnd.google-apps.folder' and 'P-1' in parents and trashed = false`,
    );
  });

  test("new-or-updated-folder: an edited folder is a new event; literal modifiedTime-desc request", async () => {
    const poll = (state: unknown, ctx: Ctx) =>
      newOrUpdatedFolder.poll!({ params: {}, state, subscriptionId: "s" }, ctx);
    const m = mockCtx([{ body: { files: [f1] } }]);
    const seeded = await poll({}, m.ctx);
    assertEquals(req(m.calls[0]), {
      method: "GET",
      path: "/drive/v3/files",
      query: { ...LIST_QS, q: FOLDER_Q, orderBy: "modifiedTime desc" },
    });
    assertEquals(seeded.events, []);
    const r = await poll(seeded.nextState, mockCtx([{ body: { files: [f2, f1b, f1] } }]).ctx);
    assertEquals(r.events, [f1b, f2]);
    const again = await poll(seeded.nextState, mockCtx([{ body: { files: [f2, f1b, f1] } }]).ctx);
    assertEquals(again, r);
  });
});

describe("new-shared-drive", () => {
  const d1 = { id: "d1", name: "Finance" };
  const d2 = { id: "d2", name: "Ops" };
  const poll = (state: unknown, ctx: Ctx) =>
    newSharedDrive.poll!({ params: {}, state, subscriptionId: "s" }, ctx);

  test("seeds, emits only the new shared drive, retries identically", async () => {
    const seeded = await poll({}, mockCtx([{ body: { drives: [d1] } }]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const a = await poll(seeded.nextState, mockCtx([{ body: { drives: [d1, d2] } }]).ctx);
    const b = await poll(seeded.nextState, mockCtx([{ body: { drives: [d1, d2] } }]).ctx);
    assertEquals(a.events, [d2]);
    assertEquals(a, b);
  });

  test("literal drives.list request; follows nextPageToken; over five pages fails clearly", async () => {
    const m = mockCtx([{ body: { drives: [d1], nextPageToken: "T2" } }, {
      body: { drives: [d2] },
    }]);
    await poll({}, m.ctx);
    assertEquals(m.calls.map(req), [
      { method: "GET", path: "/drive/v3/drives", query: { pageSize: "100" } },
      { method: "GET", path: "/drive/v3/drives", query: { pageSize: "100", pageToken: "T2" } },
    ]);
    const pages = Array.from({ length: 5 }, (_, i) => ({
      body: { drives: [{ id: `x${i}`, name: "n" }], nextPageToken: `T${i}` },
    }));
    let msg = "";
    try {
      await poll({}, mockCtx(pages).ctx);
    } catch (e) {
      msg = (e as Error).message;
    }
    assertEquals(msg.includes("more than 500 shared drives"), true);
  });
});
