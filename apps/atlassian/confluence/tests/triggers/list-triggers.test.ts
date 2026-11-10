import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newBlogpost from "../../triggers/new-blogpost.ts";
import newOrUpdatedBlogpost from "../../triggers/new-or-updated-blogpost.ts";
import newPageAttachment from "../../triggers/new-page-attachment.ts";
import newPageComment from "../../triggers/new-page-comment.ts";
import newPageLabel from "../../triggers/new-page-label.ts";
import newSpace from "../../triggers/new-space.ts";

const base = "https://acme.atlassian.net/wiki/api/v2";
const display = { display: { site: "acme" } };
const ctx = (items: unknown[]) => mockCtx([{ body: { results: items, _links: {} } }], display);
const parent = { pageId: "p1" };

const newestFirst = [
  {
    name: "new-blogpost",
    trigger: newBlogpost,
    params: {},
    url: `${base}/blogposts?sort=-created-date&limit=100`,
  },
  {
    name: "new-page-attachment",
    trigger: newPageAttachment,
    params: parent,
    url: `${base}/pages/p1/attachments?sort=-created-date&limit=100`,
  },
  {
    name: "new-page-comment",
    trigger: newPageComment,
    params: parent,
    url: `${base}/pages/p1/footer-comments?sort=-created-date&limit=100`,
  },
];

for (const c of newestFirst) {
  describe(c.name, () => {
    const input = { params: c.params, subscriptionId: "sub-1" };

    test("seeds without emitting, emits only the new item, retries idempotently", async () => {
      const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([{ id: "a" }]).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const page = [{ id: "b" }, { id: "a" }];
      const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
      const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
      assertEquals(first.events, [{ id: "b" }]);
      assertEquals(retry, first);
    });

    test("sends the list action's literal request with the newest-first sort", async () => {
      const seed = ctx([{ id: "a" }]);
      await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
    });
  });
}

describe("new-or-updated-blogpost", () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const post = (id: string, version: number) => ({ id, version: { number: version } });

  test("an edited blog post (same id, new version) is a new event, retries idempotently", async () => {
    const seed = ctx([post("a", 1)]);
    const seeded = await newOrUpdatedBlogpost.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].url, `${base}/blogposts?sort=-modified-date&limit=100`);
    const page = [post("a", 2), post("b", 1)];
    const first = await newOrUpdatedBlogpost.poll!(
      { ...input, state: seeded.nextState },
      ctx(page).ctx,
    );
    const retry = await newOrUpdatedBlogpost.poll!(
      { ...input, state: seeded.nextState },
      ctx(page).ctx,
    );
    assertEquals(first.events, [post("b", 1), post("a", 2)]);
    assertEquals(retry, first);
  });
});

const snapshots = [
  {
    name: "new-page-label",
    trigger: newPageLabel,
    params: parent,
    url: `${base}/pages/p1/labels?limit=100`,
  },
  { name: "new-space", trigger: newSpace, params: {}, url: `${base}/spaces?limit=100` },
];

for (const c of snapshots) {
  describe(c.name, () => {
    const input = { params: c.params, subscriptionId: "sub-1" };

    test("snapshots the collection, emits additions only, retries idempotently", async () => {
      const seed = ctx([{ id: "a" }]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
      const run = () =>
        c.trigger.poll!({ ...input, state: seeded.nextState }, ctx([{ id: "a" }, { id: "b" }]).ctx);
      const first = await run();
      assertEquals(first.events.map((e) => (e as { key: string }).key), ["b"]);
      assertEquals(await run(), first);
    });
  });
}
