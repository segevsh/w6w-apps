import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAgent from "../../triggers/new-agent.ts";
import newProject from "../../triggers/new-project.ts";
import newConnector from "../../triggers/new-connector.ts";
import newSkill from "../../triggers/new-skill.ts";
import newTaskEvent from "../../triggers/new-task-event.ts";
import newWebsiteCheckpoint from "../../triggers/new-website-checkpoint.ts";

const API = "https://api.manus.ai/v2";
const at = (state: unknown, params: Record<string, unknown> = {}) =>
  ({ params, state, subscriptionId: "sub-1" }) as never;

// Whole lists (no cursor, no sort): one literal GET each, then a diff by id.
const lists = [
  { trigger: newAgent, params: {}, url: `${API}/agent.list`, idKey: "id" },
  { trigger: newProject, params: {}, url: `${API}/project.list`, idKey: "id" },
  { trigger: newConnector, params: {}, url: `${API}/connector.list`, idKey: "id" },
  { trigger: newSkill, params: {}, url: `${API}/skill.list`, idKey: "id" },
  {
    trigger: newSkill,
    params: { projectId: "project-1" },
    url: `${API}/skill.list?project_id=project-1`,
    idKey: "id",
  },
];
for (const { trigger, params, url, idKey } of lists) {
  test(`${trigger.key}: seeds, emits only the new id, retries identically, sends ${url}`, async () => {
    const body = (...ids: string[]) => ({
      body: { ok: true, request_id: "r1", data: ids.map((id) => ({ [idKey]: id })) },
    });
    const seed = mockCtx([body("a")]);
    const seeded = await trigger.poll!(at({}, params), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const first = await trigger.poll!(at(seeded.nextState, params), mockCtx([body("b", "a")]).ctx);
    const retry = await trigger.poll!(at(seeded.nextState, params), mockCtx([body("b", "a")]).ctx);
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(retry, first);
  });
}

test("new-task-event: seeds, emits only the new event, retries identically, requests order=desc", async () => {
  const params = { taskId: "task-1" };
  const body = (...ids: string[]) => ({
    body: { ok: true, task_id: "task-1", messages: ids.map((id) => ({ id })), has_more: false },
  });
  const seed = mockCtx([body("e1")]);
  const seeded = await newTaskEvent.poll!(at({}, params), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${API}/task.listMessages?task_id=task-1&limit=100&order=desc`);
  const first = await newTaskEvent.poll!(
    at(seeded.nextState, params),
    mockCtx([body("e2", "e1")]).ctx,
  );
  const retry = await newTaskEvent.poll!(
    at(seeded.nextState, params),
    mockCtx([body("e2", "e1")]).ctx,
  );
  assertEquals(first.events, [{ id: "e2" }]);
  assertEquals(retry, first);
});

test("new-website-checkpoint: seeds, emits only the new checkpoint, retries identically", async () => {
  const params = { websiteId: "site-1" };
  const body = (...ids: string[]) => ({
    body: {
      ok: true,
      website_id: "site-1",
      data: ids.map((version_id) => ({ version_id })),
      published_version_id: "v1",
    },
  });
  const seed = mockCtx([body("v1")]);
  const seeded = await newWebsiteCheckpoint.poll!(at({}, params), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, `${API}/website.listCheckpoints?website_id=site-1`);
  const first = await newWebsiteCheckpoint.poll!(
    at(seeded.nextState, params),
    mockCtx([body("v2", "v1")]).ctx,
  );
  const retry = await newWebsiteCheckpoint.poll!(
    at(seeded.nextState, params),
    mockCtx([body("v2", "v1")]).ctx,
  );
  assertEquals(first.events, [{ version_id: "v2" }]);
  assertEquals(retry, first);
});
