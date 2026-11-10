import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import newAgent from "../../triggers/new-agent.ts";
import newGroup from "../../triggers/new-group.ts";
import newTag from "../../triggers/new-tag.ts";

const sub = { subscriptionId: "sub-1" };

interface Case {
  name: string;
  trigger: typeof newAgent;
  params: Record<string, unknown>;
  path: string;
  body: unknown;
  old: unknown;
  fresh: unknown;
}

const cases: Case[] = [
  {
    name: "new-agent",
    trigger: newAgent,
    params: {},
    path: "/v3.6/configuration/action/list_agents",
    body: {},
    old: { id: "smith@example.com", name: "Smith" },
    fresh: { id: "jones@example.com", name: "Jones" },
  },
  {
    name: "new-group",
    trigger: newGroup,
    params: {},
    path: "/v3.6/configuration/action/list_groups",
    body: {},
    old: { id: 0, name: "General" },
    fresh: { id: 19, name: "Sport shoes" },
  },
  {
    name: "new-tag",
    trigger: newTag,
    params: { groupIds: "0, 42" },
    path: "/v3.6/configuration/action/list_tags",
    body: { filters: { group_ids: [0, 42] } },
    old: { name: "support", group_ids: [0] },
    fresh: { name: "vip", group_ids: [0] },
  },
];

for (const c of cases) {
  test(`${c.name}: seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const input = { params: c.params, ...sub };
    const seed = mockCtx([{ body: [c.old] }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(pathOf(seed.calls[0].url), c.path);
    assertEquals(JSON.parse(seed.calls[0].body!), c.body);
    const resp = { body: [c.fresh, c.old] };
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
    const second = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([resp]).ctx,
    );
    assertEquals(first.events, [c.fresh]);
    assertEquals(first, second);
  });
}

test("new-tag: a missing group list is refused by the wrapped action", async () => {
  await assertRejects(
    () => newTag.poll!({ params: {}, ...sub, state: {} }, mockCtx([{ body: [] }]).ctx),
    Error,
    "groupIds",
  );
});
