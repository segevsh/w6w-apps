import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCompany from "../../triggers/new-company.ts";
import newEmployee from "../../triggers/new-employee.ts";
import newProduct from "../../triggers/new-product.ts";
import newOpportunity from "../../triggers/new-opportunity.ts";
import newProject from "../../triggers/new-project.ts";
import newTask from "../../triggers/new-task.ts";
import newQuotation from "../../triggers/new-quotation.ts";
import { MAX_PAGES } from "../../lib/snapshot.ts";

const B = "https://axonaut.com/api/v2";
const empty = { body: [] };
const rec = (id: number) => ({ id, name: `Record ${id}` });

async function at<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

// Table-driven: the unordered, unfiltered lists (read whole, ids diffed) share one case set.
const specs = [
  { name: "new-company", trigger: newCompany, url: `${B}/companies` },
  { name: "new-employee", trigger: newEmployee, url: `${B}/employees` },
  { name: "new-product", trigger: newProduct, url: `${B}/products` },
  { name: "new-opportunity", trigger: newOpportunity, url: `${B}/opportunities` },
  { name: "new-project", trigger: newProject, url: `${B}/projects` },
  { name: "new-task", trigger: newTask, url: `${B}/tasks` },
  {
    name: "new-quotation",
    trigger: newQuotation,
    url: `${B}/quotations?date_after=2026-10-09`,
  },
];

for (const { name, trigger, url } of specs) {
  const input = { params: {}, subscriptionId: "sub-1" };
  const run = (state: unknown, responses: Array<{ body: unknown }>) => {
    const m = mockCtx(responses);
    return at("2026-11-09T12:00:00Z", async () => ({
      r: await trigger.poll!({ ...input, state }, m.ctx),
      calls: m.calls,
    }));
  };

  test(`${name}: seeds without events and reads page 1, 2 until the first empty page (literal request)`, async () => {
    const s = await run({}, [{ body: [rec(1)] }, { body: [rec(2)] }, empty]);
    assertEquals(s.r.events, []);
    assertEquals((s.r.nextState as { seeded: boolean }).seeded, true);
    assertEquals(s.calls.map((c) => c.method), ["GET", "GET", "GET"]);
    assertEquals(s.calls.map((c) => c.url), [url, url, url]);
    assertEquals(s.calls.map((c) => c.headers["page"]), ["1", "2", "3"]);
  });

  test(`${name}: emits only the new record (also from page 2), retries identically`, async () => {
    const s = await run({}, [{ body: [rec(1)] }, empty]);
    const pages = () => [{ body: [rec(1)] }, { body: [rec(2)] }, empty];
    const first = await run(s.r.nextState, pages());
    const retry = await run(s.r.nextState, pages());
    assertEquals(first.r.events, [rec(2)]);
    assertEquals(retry.r, first.r);
    const again = await run(first.r.nextState, pages());
    assertEquals(again.r.events, []);
  });
}

test("new-company: a list that never ends fails the check instead of reading forever", async () => {
  const m = mockCtx(Array.from({ length: MAX_PAGES }, () => ({ body: [rec(1)] })));
  await assertRejects(
    () => newCompany.poll!({ params: {}, state: {}, subscriptionId: "s" }, m.ctx),
    Error,
    "longer than",
  );
});
