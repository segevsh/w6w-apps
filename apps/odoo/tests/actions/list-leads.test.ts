import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/list-leads.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

test("list-leads: is a search action over crm.lead", () => {
  assertEquals(action.key, "list-leads");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "crm.lead");
});

test("list-leads: search_reads crm.lead with the domain in kwargs", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 27 }] }]);
  await action.execute({ domain: [["type", "=", "opportunity"]], limit: 10 }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "crm.lead",
    method: "search_read",
    args: [],
    kwargs: { domain: [["type", "=", "opportunity"]], limit: 10 },
  });
});

test("list-leads: returns records and count", async () => {
  const { ctx } = mockCtx([{ result: [{ id: 27 }, { id: 26 }] }]);
  const out = await action.execute({}, ctx) as { count: number };
  assertEquals(out.count, 2);
});

test("list-leads: says leads and opportunities share one model", () => {
  assert(/opportunit/i.test(description(action)));
  assert(/CRM app/i.test(description(action)));
});
