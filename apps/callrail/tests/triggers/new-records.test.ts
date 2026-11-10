import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import newCompany from "../../triggers/new-company.ts";
import newTracker from "../../triggers/new-tracker.ts";
import newTag from "../../triggers/new-tag.ts";
import newUser from "../../triggers/new-user.ts";
import newFormSubmission from "../../triggers/new-form-submission.ts";
import newTextConversation from "../../triggers/new-text-conversation.ts";
import newOrUpdatedTextConversation from "../../triggers/new-or-updated-text-conversation.ts";

const params = { accountId: "ACC1" };
const sent = (c: { method: string; url: string }) => ({
  method: c.method,
  path: new URL(c.url).pathname,
  query: Object.fromEntries(new URL(c.url).searchParams),
});

const cases = [
  {
    trigger: newCompany,
    listKey: "companies",
    path: "/v3/a/ACC1/companies.json",
    query: { sort: "name", order: "asc", page: "1", per_page: "250" },
  },
  {
    trigger: newTracker,
    listKey: "trackers",
    path: "/v3/a/ACC1/trackers.json",
    query: { sort: "name", order: "asc", page: "1", per_page: "250" },
  },
  {
    trigger: newTag,
    listKey: "tags",
    path: "/v3/a/ACC1/tags.json",
    query: { sort: "name", order: "asc", page: "1", per_page: "250" },
  },
  {
    trigger: newUser,
    listKey: "users",
    path: "/v3/a/ACC1/users.json",
    query: { sort: "created_at", order: "desc", page: "1", per_page: "100" },
  },
  {
    trigger: newFormSubmission,
    listKey: "form_submissions",
    path: "/v3/a/ACC1/form_submissions.json",
    query: { sort: "submitted_at", order: "desc", page: "1", per_page: "100" },
  },
  {
    trigger: newTextConversation,
    listKey: "conversations",
    path: "/v3/a/ACC1/text-messages.json",
    query: { page: "1", per_page: "100" },
  },
];

for (const c of cases) {
  test(`${c.trigger.key} seeds, emits only the new record, retries identically, sends the literal request`, async () => {
    const seeded = await c.trigger.poll!(
      { params, state: {} },
      mockCtx([{ body: listEnvelope(c.listKey, [{ id: "a" }]) }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    const page = { body: listEnvelope(c.listKey, [{ id: "b" }, { id: "a" }]) };
    const run = mockCtx([page]);
    const first = await c.trigger.poll!({ params, state: seeded.nextState }, run.ctx);
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(run.calls.map(sent), [{ method: "GET", path: c.path, query: c.query }]);
    assertEquals(
      await c.trigger.poll!({ params, state: seeded.nextState }, mockCtx([page]).ctx),
      first,
    );
  });
}

test("snapshot triggers page through every page of the collection", async () => {
  const page1 = { ...listEnvelope("companies", [{ id: "a" }]), total_pages: 2 };
  const page2 = { ...listEnvelope("companies", [{ id: "b" }]), page: 2, total_pages: 2 };
  const run = mockCtx([{ body: page1 }, { body: page2 }]);
  const out = await newCompany.poll!({ params, state: {} }, run.ctx);
  assertEquals(run.calls.map((c) => sent(c).query.page), ["1", "2"]);
  const again = mockCtx([{ body: page1 }, {
    body: { ...page2, companies: [{ id: "b" }, { id: "c" }] },
  }]);
  const next = await newCompany.poll!({ params, state: out.nextState }, again.ctx);
  assertEquals(next.events, [{ id: "c" }]);
});

test("company filter is forwarded by tracker and tag triggers", async () => {
  const run = mockCtx([{ body: listEnvelope("tags", []) }]);
  await newTag.poll!({ params: { ...params, companyId: "COM9" }, state: {} }, run.ctx);
  assertEquals(sent(run.calls[0]).query.company_id, "COM9");
});

test("new-or-updated-text-conversation emits a conversation again when it gets a new message", async () => {
  const t = newOrUpdatedTextConversation;
  const old = [{ id: "a", last_message_at: "2026-11-09T10:00:00.000Z" }];
  const seeded = await t.poll!(
    { params, state: {} },
    mockCtx([{ body: listEnvelope("conversations", old) }]).ctx,
  );
  assertEquals(seeded.events, []);
  const edited = [{ id: "a", last_message_at: "2026-11-10T10:00:00.000Z" }];
  const run = mockCtx([{ body: listEnvelope("conversations", [...edited, ...old]) }]);
  const out = await t.poll!({ params, state: seeded.nextState }, run.ctx);
  assertEquals(out.events, edited);
  assertEquals(run.calls.map(sent), [{
    method: "GET",
    path: "/v3/a/ACC1/text-messages.json",
    query: { fields: "last_message_at", page: "1", per_page: "100" },
  }]);
  const retry = await t.poll!(
    { params, state: seeded.nextState },
    mockCtx([{ body: listEnvelope("conversations", [...edited, ...old]) }]).ctx,
  );
  assertEquals(retry, out);
});
