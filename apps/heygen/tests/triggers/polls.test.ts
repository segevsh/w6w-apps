import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import newTemplate from "../../triggers/new-template.ts";
import newAvatarGroup from "../../triggers/new-avatar-group.ts";
import newAvatarLook from "../../triggers/new-avatar-look.ts";

const input = (state: unknown) => ({ params: {}, subscriptionId: "sub_1", state });
const item = (id: string) => ({ id, name: `n_${id}` });
const page = (ids: string[], next?: string) => ({
  body: listEnvelope(ids.map(item), { has_more: next !== undefined, next_token: next ?? null }),
});

const CASES = [
  { t: newTemplate, url: "https://api.heygen.com/v3/templates?limit=100" },
  { t: newAvatarGroup, url: "https://api.heygen.com/v3/avatars?ownership=private&limit=50" },
  {
    t: newAvatarLook,
    url: "https://api.heygen.com/v3/avatars/looks?ownership=private&limit=50",
  },
];

for (const { t, url } of CASES) {
  describe(t.key, () => {
    test("first check seeds without events; the request is the literal list call", async () => {
      const m = mockCtx([page(["a", "b"])]);
      const r = await t.poll!(input({}), m.ctx);
      assert.deepEqual(r.events, []);
      assert.equal((r.nextState as { seeded?: boolean }).seeded, true);
      assert.deepEqual([m.calls[0].method, m.calls[0].url], ["GET", url]);
      assert.equal(m.calls.length, 1);
    });

    test("a row added after the seed is emitted once as the raw item; a retry is identical", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page(["a"])]).ctx);
      const run = () => t.poll!(input(seeded.nextState), mockCtx([page(["a", "b"])]).ctx);
      const first = await run();
      assert.deepEqual(first.events, [item("b")]);
      assert.deepEqual(await run(), first);
      const again = await t.poll!(input(first.nextState), mockCtx([page(["a", "b"])]).ctx);
      assert.deepEqual(again.events, []);
    });

    test("an edited or removed row is not a new one", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page(["a", "b"])]).ctx);
      const edited = { body: listEnvelope([{ id: "a", name: "renamed" }]) };
      const r = await t.poll!(input(seeded.nextState), mockCtx([edited]).ctx);
      assert.deepEqual(r.events, []);
    });

    test("follows next_token: a row on page 2 is seen, and the 2nd request carries the token", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page(["a"])]).ctx);
      const two = mockCtx([page(["a"], "tok2"), page(["z"])]);
      const r = await t.poll!(input(seeded.nextState), two.ctx);
      assert.deepEqual(r.events, [item("z")]);
      assert.equal(two.calls[1].url, `${url}&token=tok2`);
    });

    test("still has_more after 20 pages: the check throws instead of diffing a partial list", async () => {
      const pages = Array.from({ length: 20 }, (_, i) => page([`p${i}`], `tok${i + 1}`));
      const m = mockCtx(pages);
      await assert.rejects(t.poll!(input({}), m.ctx), /still has more rows after 20 page/);
      assert.equal(m.calls.length, 20);
    });

    test("rows without an id are ignored; an empty account seeds an empty snapshot", async () => {
      const r = await t.poll!(
        input({}),
        mockCtx([{ body: listEnvelope([{ name: "no id" }]) }]).ctx,
      );
      assert.deepEqual(r.events, []);
      const empty = await t.poll!(input({}), mockCtx([page([])]).ctx);
      assert.equal((empty.nextState as { seeded?: boolean }).seeded, true);
    });
  });
}
