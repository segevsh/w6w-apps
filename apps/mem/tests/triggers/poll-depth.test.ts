import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newNote from "../../triggers/new-note.ts";
import newOrUpdatedNote from "../../triggers/new-or-updated-note.ts";
import newCollection from "../../triggers/new-collection.ts";
import newOrUpdatedCollection from "../../triggers/new-or-updated-collection.ts";
import newFollowUp from "../../triggers/new-follow-up.ts";
import newOrUpdatedFollowUp from "../../triggers/new-or-updated-follow-up.ts";
import newProject from "../../triggers/new-project.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";

const input = { params: {}, subscriptionId: "sub" };
const item = (id: string, updated_at = "t1") => ({ id, updated_at });
const ctx = (items: unknown[]) => mockCtx([{ body: { results: items, total: items.length } }]);

const cases = [
  {
    trigger: newNote,
    updated: false,
    url: "https://api.mem.ai/v2/notes?limit=100&order_by=created_at",
  },
  {
    trigger: newOrUpdatedNote,
    updated: true,
    url: "https://api.mem.ai/v2/notes?limit=100&order_by=updated_at",
  },
  {
    trigger: newCollection,
    updated: false,
    url: "https://api.mem.ai/v2/collections?limit=100&order_by=created_at",
  },
  {
    trigger: newOrUpdatedCollection,
    updated: true,
    url: "https://api.mem.ai/v2/collections?limit=100&order_by=updated_at",
  },
  {
    trigger: newFollowUp,
    updated: false,
    url: "https://api.mem.ai/v2/follow-ups?limit=100&order_by=created_at",
  },
  {
    trigger: newOrUpdatedFollowUp,
    updated: true,
    url: "https://api.mem.ai/v2/follow-ups?limit=100&order_by=updated_at",
  },
  {
    trigger: newProject,
    updated: false,
    url: "https://api.mem.ai/v2/projects?limit=100&order_by=created_at",
  },
  {
    trigger: newOrUpdatedProject,
    updated: true,
    url: "https://api.mem.ai/v2/projects?limit=100&order_by=updated_at",
  },
];

for (const c of cases) {
  const key = c.trigger.key;

  test(`${key}: seeds, emits only the new record, retries idempotently, requests the literal list URL`, async () => {
    const seed = ctx([item("a")]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
      method: "GET",
      url: c.url,
    });
    const page = [item("b"), item("a")];
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
  });

  test(
    `${key}: an edited record (same id, new updated_at) ${
      c.updated ? "is emitted once" : "is not a new record"
    }`,
    async () => {
      const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([item("a", "t1")]).ctx);
      const res = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        ctx([item("a", "t2")]).ctx,
      );
      assertEquals(res.events, c.updated ? [item("a", "t2")] : []);
    },
  );
}
