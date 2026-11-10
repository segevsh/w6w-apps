import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTicket from "../../triggers/new-ticket.ts";
import newAccount from "../../triggers/new-account.ts";
import newAgent from "../../triggers/new-agent.ts";
import newDepartment from "../../triggers/new-department.ts";

const input = { params: { orgId: "org-1" }, subscriptionId: "sub-1" };
const page = (...rows: unknown[]) => mockCtx([{ body: { data: rows } }]);
const D = "https://desk.zoho.com/api/v1";

// Table-driven: the newest-first (pollFromListAction) triggers and the bounded (pollSnapshot) ones
// share one case set.
const specs: Array<{ name: string; trigger: typeof newTicket; url: string }> = [
  { name: "new-ticket", trigger: newTicket, url: `${D}/tickets?limit=100&sortBy=-createdTime` },
  { name: "new-account", trigger: newAccount, url: `${D}/accounts?limit=100&sortBy=-createdTime` },
  { name: "new-agent", trigger: newAgent, url: `${D}/agents?from=1&limit=100` },
  { name: "new-department", trigger: newDepartment, url: `${D}/departments?from=1&limit=100` },
];

for (const { name, trigger, url } of specs) {
  const item = (id: string) => ({ id });

  test(`${name}: seeds without events and sends the documented request with the org header`, async () => {
    const seed = page(item("a"));
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
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

test("new-ticket: an edited ticket is not a new-ticket event", async () => {
  const seeded = await newTicket.poll!(
    { ...input, state: {} },
    page({ id: "a", modifiedTime: "t1" }).ctx,
  );
  const r = await newTicket.poll!(
    { ...input, state: seeded.nextState },
    page({ id: "a", modifiedTime: "t2" }).ctx,
  );
  assertEquals(r.events, []);
});
