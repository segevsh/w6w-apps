import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import newChatbot from "../../triggers/new-chatbot.ts";
import newEmailInbox from "../../triggers/new-email-inbox.ts";
import newTicketForm from "../../triggers/new-ticket-form.ts";
import newKnowledgeItem from "../../triggers/new-knowledge-item.ts";
import newChatbotKnowledge from "../../triggers/new-chatbot-knowledge.ts";
import newEmailInboxKnowledge from "../../triggers/new-email-inbox-knowledge.ts";
import newTicketFormKnowledge from "../../triggers/new-ticket-form-knowledge.ts";
import newKnowledgeSubPage from "../../triggers/new-knowledge-sub-page.ts";
import newFaqItem from "../../triggers/new-faq-item.ts";

const base = "https://api.aidbase.ai/v1";
// bare: the three account lists are unpaginated arrays; paged: `{ items, has_more, next_cursor }`.
const cases = [
  {
    name: "new-chatbot",
    trigger: newChatbot,
    params: {},
    path: "/chatbots",
    bare: true,
    idf: "id",
  },
  {
    name: "new-email-inbox",
    trigger: newEmailInbox,
    params: {},
    path: "/email-inboxes",
    bare: true,
    idf: "id",
  },
  {
    name: "new-ticket-form",
    trigger: newTicketForm,
    params: {},
    path: "/ticket-forms",
    bare: true,
    idf: "id",
  },
  {
    name: "new-knowledge-item",
    trigger: newKnowledgeItem,
    params: {},
    path: "/knowledge",
    idf: "id",
  },
  {
    name: "new-chatbot-knowledge",
    trigger: newChatbotKnowledge,
    params: { chatbotId: "bot1" },
    path: "/chatbot/bot1/knowledge",
    idf: "id",
  },
  {
    name: "new-email-inbox-knowledge",
    trigger: newEmailInboxKnowledge,
    params: { emailInboxId: "in1" },
    path: "/email-inbox/in1/knowledge",
    idf: "id",
  },
  {
    name: "new-ticket-form-knowledge",
    trigger: newTicketFormKnowledge,
    params: { ticketFormId: "tf1" },
    path: "/ticket-form/tf1/knowledge",
    idf: "id",
  },
  {
    name: "new-knowledge-sub-page",
    trigger: newKnowledgeSubPage,
    params: { knowledgeId: "k1" },
    path: "/knowledge/k1/sub-pages",
    idf: "page_url",
  },
  {
    name: "new-faq-item",
    trigger: newFaqItem,
    params: { knowledgeId: "k1" },
    path: "/knowledge/k1/faq-items",
    idf: "id",
  },
];
const input = { subscriptionId: "sub-1" };

for (const { name, trigger, params, path, bare, idf } of cases) {
  const row = (n: number) => ({ [idf]: `r${n}`, label: `Record ${n}` });
  const resp = (rows: unknown[], next?: string): MockResponse => ({
    body: {
      success: true,
      data: bare ? rows : { items: rows, has_more: !!next, ...(next ? { next_cursor: next } : {}) },
    },
  });

  test(`${name}: seeds without emitting, emits only the new id, retries idempotently`, async () => {
    const seeded = await trigger.poll!(
      { ...input, params, state: {} },
      mockCtx([resp([row(1)])]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () =>
      trigger.poll!(
        { ...input, params, state: seeded.nextState },
        mockCtx([resp([row(1), row(2)])]).ctx,
      );
    const first = await run();
    assertEquals(first.events.map((e) => (e as { key: string }).key), ["r2"]);
    assertEquals(await run(), first);
  });

  test(`${name}: requests the wrapped list endpoint with no page size`, async () => {
    const m = mockCtx([resp([row(1)])]);
    await trigger.poll!({ ...input, params, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, `${base}${path}`);
  });
}

test("snapshot triggers: follow next_cursor to the end of a paged list", async () => {
  const m = mockCtx([
    { body: { success: true, data: { items: [{ id: "a" }], has_more: true, next_cursor: "c1" } } },
    { body: { success: true, data: { items: [{ id: "b" }], has_more: false } } },
  ]);
  const seeded = await newKnowledgeItem.poll!({ ...input, params: {}, state: {} }, m.ctx);
  assertEquals(m.calls.map((c) => c.url), [
    `${base}/knowledge`,
    `${base}/knowledge?next_cursor=c1`,
  ]);
  const next = await newKnowledgeItem.poll!(
    { ...input, params: {}, state: seeded.nextState },
    mockCtx([
      {
        body: { success: true, data: { items: [{ id: "a" }], has_more: true, next_cursor: "c1" } },
      },
      { body: { success: true, data: { items: [{ id: "b" }, { id: "c" }], has_more: false } } },
    ]).ctx,
  );
  assertEquals(next.events.map((e) => (e as { key: string }).key), ["c"]);
});
