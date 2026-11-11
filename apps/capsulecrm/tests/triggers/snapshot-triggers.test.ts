import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPipeline from "../../triggers/new-pipeline.ts";
import newMilestone from "../../triggers/new-milestone.ts";
import newUser from "../../triggers/new-user.ts";

const next = (path: string, n: number) => ({
  link: `<https://api.capsulecrm.com/api/v2/${path}?page=${n}>; rel="next"`,
});
const cases = [
  {
    trigger: newPipeline,
    params: {},
    key: "pipelines",
    url: "https://api.capsulecrm.com/api/v2/pipelines?page=1&perPage=100",
  },
  {
    trigger: newMilestone,
    params: { pipelineId: "12" },
    key: "milestones",
    url: "https://api.capsulecrm.com/api/v2/pipelines/12/milestones?page=1&perPage=100",
  },
  {
    trigger: newUser,
    params: {},
    key: "users",
    url: "https://api.capsulecrm.com/api/v2/users",
  },
];

for (const c of cases) {
  test(`${c.trigger.key} seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const input = { params: c.params, subscriptionId: "s" };
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: { [c.key]: [{ id: 1 }] } }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const body = { [c.key]: [{ id: 1 }, { id: 2 }] };
    const run = mockCtx([{ body }]);
    const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, run.ctx);
    assertEquals(first.events, [{ id: 2 }]);
    assertEquals(run.calls.map((x) => [x.method, x.url]), [["GET", c.url]]);
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body }]).ctx,
    );
    assertEquals(retry, first);
  });
}

test("new-pipeline follows the next-page link until the collection is read", async () => {
  const run = mockCtx([
    { body: { pipelines: [{ id: 1 }] }, headers: next("pipelines", 2) },
    { body: { pipelines: [{ id: 2 }] } },
  ]);
  await newPipeline.poll!({ params: {}, state: {} }, run.ctx);
  assertEquals(run.calls.map((x) => x.url), [
    "https://api.capsulecrm.com/api/v2/pipelines?page=1&perPage=100",
    "https://api.capsulecrm.com/api/v2/pipelines?page=2&perPage=100",
  ]);
});

test("new-milestone rejects a non-numeric pipeline id", async () => {
  let message = "";
  try {
    await newMilestone.poll!({ params: { pipelineId: "abc" }, state: {} }, mockCtx([]).ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "pipelineId must be a numeric pipeline id");
});
