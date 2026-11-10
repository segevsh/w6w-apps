import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import newTemplate from "../../triggers/new-template.ts";
import newCollaborator from "../../triggers/new-template-collaborator.ts";

const input = { subscriptionId: "sub_1" };
const tpl = (id: string) => ({ template_id: id, title: `Title ${id}` });
const collab = (id: string) => ({
  template_collaborator_id: id,
  template_id: "4templ44-8888",
  name: `Name ${id}`,
  email: `${id}@acme.test`,
});
const withUrl = (id: string) => ({
  ...collab(id),
  template_collaborator_editor_url:
    `https://esignatures.com/contract_template_collaborators/${id}/editor`,
});
const ok = (data: unknown) => ({ body: { status: "queued", data } });
const seededOf = (s: unknown) => (s as { seeded?: boolean }).seeded;

test("new-template: seeds, emits only added templates, retries idempotently", async () => {
  const seeded = await newTemplate.poll!(
    { ...input, params: {}, state: {} },
    mockCtx([ok([tpl("a")])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);
  const run = () =>
    newTemplate.poll!(
      { ...input, params: {}, state: seeded.nextState },
      mockCtx([ok([tpl("a"), tpl("b")])]).ctx,
    );
  const result = await run();
  assertEquals(result.events, [tpl("b")]);
  assertEquals(await run(), result);
});

test("new-template: requests GET /api/templates and nothing else (literal)", async () => {
  const m = mockCtx([ok([])]);
  await newTemplate.poll!({ ...input, params: {}, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(pathOf(m.calls[0].url), "/api/templates");
  assertEquals(new URL(m.calls[0].url).search, "");
});

test("new-template: a rename or a removal does not emit", async () => {
  const seeded = await newTemplate.poll!(
    { ...input, params: {}, state: {} },
    mockCtx([ok([tpl("a"), tpl("b")])]).ctx,
  );
  const next = await newTemplate.poll!(
    { ...input, params: {}, state: seeded.nextState },
    mockCtx([ok([{ ...tpl("a"), title: "Renamed" }])]).ctx,
  );
  assertEquals(next.events, []);
});

test("new-template-collaborator: seeds, emits only the collaborator added since, retries idempotently", async () => {
  const params = { templateId: "4templ44-8888" };
  const seeded = await newCollaborator.poll!(
    { ...input, params, state: {} },
    mockCtx([ok([withUrl("c1")])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);
  const run = () =>
    newCollaborator.poll!(
      { ...input, params, state: seeded.nextState },
      mockCtx([ok([withUrl("c1"), withUrl("c2")])]).ctx,
    );
  const result = await run();
  assertEquals(result.events, [collab("c2")]);
  assertEquals(await run(), result);
});

test("new-template-collaborator: requests GET /api/templates/{id}/collaborators (literal)", async () => {
  const m = mockCtx([ok([])]);
  await newCollaborator.poll!(
    { ...input, params: { templateId: "4templ44-8888" }, state: {} },
    m.ctx,
  );
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(pathOf(m.calls[0].url), "/api/templates/4templ44-8888/collaborators");
});

test("new-template-collaborator: the editor link never reaches the run or the stored state", async () => {
  const params = { templateId: "4templ44-8888" };
  const seeded = await newCollaborator.poll!(
    { ...input, params, state: {} },
    mockCtx([ok([])]).ctx,
  );
  const next = await newCollaborator.poll!(
    { ...input, params, state: seeded.nextState },
    mockCtx([ok([withUrl("c9")])]).ctx,
  );
  assertEquals(next.events.length, 1);
  const wire = JSON.stringify({ events: next.events, state: next.nextState });
  assert(!wire.includes("editor"), "no editor URL in the event or the state");
  assert(!wire.includes("contract_template_collaborators"));
});

test("new-template-collaborator: a missing template id is refused before any request", async () => {
  const m = mockCtx();
  await assertRejects(
    () => newCollaborator.poll!({ ...input, params: {}, state: {} }, m.ctx),
    Error,
    "Template ID is required",
  );
  assertEquals(m.calls.length, 0);
});
