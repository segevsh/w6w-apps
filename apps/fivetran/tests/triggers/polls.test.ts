import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import newDestination from "../../triggers/new-destination.ts";
import newTransformation from "../../triggers/new-transformation.ts";
import newTransformationProject from "../../triggers/new-transformation-project.ts";
import newUser from "../../triggers/new-user.ts";

const input = (state: unknown) => ({ params: {}, subscriptionId: "sub_1", state });
const page = (...ids: string[]) => ({
  body: {
    code: "Success",
    data: { items: ids.map((id) => ({ id, name: `n_${id}` })), next_cursor: null },
  },
});

const CASES = [
  { t: newDestination, url: "https://api.fivetran.com/v1/destinations?limit=1000" },
  { t: newTransformation, url: "https://api.fivetran.com/v1/transformations?limit=1000" },
  {
    t: newTransformationProject,
    url: "https://api.fivetran.com/v1/transformation-projects?limit=1000",
  },
  { t: newUser, url: "https://api.fivetran.com/v1/users?limit=1000" },
];

for (const { t, url } of CASES) {
  describe(t.key, () => {
    test("first check seeds without events; the request is the literal list call", async () => {
      const m = mockCtx([page("a", "b")]);
      const r = await t.poll!(input({}), m.ctx);
      assert.deepEqual(r.events, []);
      assert.equal((r.nextState as { seeded?: boolean }).seeded, true);
      assert.deepEqual([m.calls[0].method, m.calls[0].url], ["GET", url]);
      assert.equal(m.calls.length, 1);
    });

    test("a row added after the seed is emitted once as the raw item; a retry is identical", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page("a")]).ctx);
      const run = () => t.poll!(input(seeded.nextState), mockCtx([page("a", "b")]).ctx);
      const first = await run();
      assert.deepEqual(first.events, [{ id: "b", name: "n_b" }]);
      assert.deepEqual(await run(), first);
      const again = await t.poll!(input(first.nextState), mockCtx([page("a", "b")]).ctx);
      assert.deepEqual(again.events, []);
    });

    test("an edited or removed row is not a new one", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page("a", "b")]).ctx);
      const edited = { body: { code: "Success", data: { items: [{ id: "a", name: "renamed" }] } } };
      const r = await t.poll!(input(seeded.nextState), mockCtx([edited]).ctx);
      assert.deepEqual(r.events, []);
    });

    test("follows the cursor: a row on page 2 is seen; an empty account seeds empty", async () => {
      const seeded = await t.poll!(input({}), mockCtx([page("a")]).ctx);
      const two = mockCtx([
        { body: { code: "Success", data: { items: [{ id: "a" }], next_cursor: "c2" } } },
        { body: { code: "Success", data: { items: [{ id: "z" }], next_cursor: null } } },
      ]);
      const r = await t.poll!(input(seeded.nextState), two.ctx);
      assert.deepEqual(r.events, [{ id: "z" }]);
      assert.equal(two.calls[1].url, `${url}&cursor=c2`);
      const empty = await t.poll!(input({}), mockCtx([page()]).ctx);
      assert.equal((empty.nextState as { seeded?: boolean }).seeded, true);
    });
  });
}
