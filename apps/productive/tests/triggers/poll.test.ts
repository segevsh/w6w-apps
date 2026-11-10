import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { pollTriggers } from "../../triggers/poll.ts";

const request: Record<string, string> = {
  "new-board": "boards?page%5Bsize%5D=200&page%5Bnumber%5D=1",
  "new-booking": "bookings?sort=-started_on&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-comment": "comments?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-company": "companies?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-deal-status": "deal_statuses?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-invoice": "invoices?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-page": "pages?sort=-edited_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-person": "people?sort=-joined_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-project": "projects?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-service": "services?sort=-name&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-task": "tasks?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-tasklist": "task_lists?sort=-project_name&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-time-entry": "time_entries?sort=-date&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  "new-todo": "todos?page%5Bsize%5D=200&page%5Bnumber%5D=1",
  "new-webhook": "webhooks?page%5Bsize%5D=200&page%5Bnumber%5D=1",
  "new-workflow-status": "workflow_statuses?sort=-name&page%5Bsize%5D=100&page%5Bnumber%5D=1",
};
const body = (ids: string[]) => ({
  data: ids.map((id) => ({ id, type: "records", attributes: { name: id } })),
  meta: { total_count: ids.length, current_page: 1, total_pages: 1, page_size: 100 },
  links: {},
});

for (const trigger of pollTriggers) {
  test(`${trigger.key}: seeds, emits, retries idempotently, and requests its literal page`, async () => {
    const seed = mockCtx([{ status: 200, body: body(["a"]) }]);
    const seeded = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "sub-1" },
      seed.ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `https://api.productive.io/api/v2/${request[trigger.key]}`);

    const next = mockCtx([{ status: 200, body: body(["b", "a"]) }]);
    const first = await trigger.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "sub-1" },
      next.ctx,
    );
    const retry = await trigger.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "sub-1" },
      mockCtx([{ status: 200, body: body(["b", "a"]) }]).ctx,
    );
    assertEquals((first.events as Array<{ id: string }>).map((item) => item.id), ["b"]);
    assertEquals(retry, first);
  });
}
