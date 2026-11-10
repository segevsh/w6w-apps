import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newThread from "../../triggers/new-ticket-thread.ts";
import newComment from "../../triggers/new-ticket-comment.ts";
import newAttachment from "../../triggers/new-ticket-attachment.ts";

const input = { params: { orgId: "org-1", ticketId: "t-9" }, subscriptionId: "sub-1" };
const page = (...rows: unknown[]) => mockCtx([{ body: { data: rows } }]);
const D = "https://desk.zoho.com/api/v1/tickets/t-9";

const specs: Array<{ name: string; trigger: typeof newThread; url: string }> = [
  { name: "new-ticket-thread", trigger: newThread, url: `${D}/threads?limit=100` },
  {
    name: "new-ticket-comment",
    trigger: newComment,
    url: `${D}/comments?limit=100&sortBy=-commentedTime`,
  },
  {
    name: "new-ticket-attachment",
    trigger: newAttachment,
    url: `${D}/attachments?limit=100&sortBy=-createdTime`,
  },
];

for (const { name, trigger, url } of specs) {
  const item = (id: string) => ({ id });

  test(`${name}: requires ticketId and sends the documented request for that ticket`, async () => {
    assertEquals(
      trigger.params?.find((p) => p.key === "ticketId")?.required,
      true,
    );
    const seed = page(item("a"));
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    assertEquals(seed.calls[0].headers["orgId"] ?? seed.calls[0].headers["orgid"], "org-1");
  });

  test(`${name}: emits only the new record, and a retry from the same state is identical`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
    const rows = [item("b"), item("a")];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
    assertEquals(first.events, [item("b")]);
    assertEquals(retry, first);
    const again = await trigger.poll!({ ...input, state: first.nextState }, page(...rows).ctx);
    assertEquals(again.events, []);
  });
}
