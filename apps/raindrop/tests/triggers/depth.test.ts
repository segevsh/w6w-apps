import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newBackup from "../../triggers/new-backup.ts";
import newSubCollection from "../../triggers/new-sub-collection.ts";
import newTag from "../../triggers/new-tag.ts";
import newCollaborator from "../../triggers/new-collaborator.ts";

const input = (params: Record<string, unknown>, state: unknown) =>
  ({ params, state, subscriptionId: "sub-1" }) as never;
const ctx = (items: unknown[]) => mockCtx([{ body: { result: true, items } }]);
const base = "https://api.raindrop.io/rest/v1";

describe("new-backup (newest first)", () => {
  test("seeds, emits only newer backups, retries idempotently, requests the literal list", async () => {
    const seed = ctx([{ _id: "b1", created: "2026-11-09T09:00:00.000Z" }]);
    const seeded = await newBackup.poll!(input({}, {}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${base}/backups`);
    const page = [{ _id: "b2", created: "2026-11-10T09:00:00.000Z" }, {
      _id: "b1",
      created: "2026-11-09T09:00:00.000Z",
    }];
    const a = await newBackup.poll!(input({}, seeded.nextState), ctx(page).ctx);
    const b = await newBackup.poll!(input({}, seeded.nextState), ctx(page).ctx);
    assertEquals(a.events, [{ _id: "b2", created: "2026-11-10T09:00:00.000Z" }]);
    assertEquals(b, a);
  });
});

const snapshotCases = [
  { trigger: newSubCollection, params: {}, url: `${base}/collections/childrens`, id: "_id" },
  { trigger: newTag, params: {}, url: `${base}/tags`, id: "_id" },
  {
    trigger: newCollaborator,
    params: { collectionId: 42 },
    url: `${base}/collection/42/sharing`,
    id: "_id",
  },
];
describe("snapshot triggers", () => {
  for (const c of snapshotCases) {
    test(`${c.trigger.key}: seeds, requests the literal list, emits only the added row, ignores edits, retries`, async () => {
      const seed = ctx([{ _id: "1", title: "A" }]);
      const seeded = await c.trigger.poll!(input(c.params, {}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const rows = [{ _id: "2", title: "B" }, { _id: "1", title: "A" }];
      const a = await c.trigger.poll!(input(c.params, seeded.nextState), ctx(rows).ctx);
      const b = await c.trigger.poll!(input(c.params, seeded.nextState), ctx(rows).ctx);
      assertEquals(a.events, [{ _id: "2", title: "B" }]);
      assertEquals(b, a);
      const edited = await c.trigger.poll!(
        input(c.params, seeded.nextState),
        ctx([{ _id: "1", title: "A renamed" }]).ctx,
      );
      assertEquals(edited.events, []);
    });
  }
  test("new-collaborator requires a collection id", async () => {
    let message = "";
    try {
      await newCollaborator.poll!(input({}, {}), ctx([]).ctx);
    } catch (e) {
      message = (e as Error).message;
    }
    assertEquals(message.includes("collectionId is required"), true);
  });
});
