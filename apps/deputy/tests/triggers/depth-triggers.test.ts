import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newArea from "../../triggers/new-area.ts";
import newLeaveRequest from "../../triggers/new-leave-request.ts";
import newLocation from "../../triggers/new-location.ts";
import newOrUpdatedLeaveRequest from "../../triggers/new-or-updated-leave-request.ts";
import newOrUpdatedTimesheet from "../../triggers/new-or-updated-timesheet.ts";
import newTimesheet from "../../triggers/new-timesheet.ts";

const BASE = "https://acme.au.deputy.com/api/v1/resource";
const opts = { display: { baseUrl: "https://acme.au.deputy.com" } };
const T = (Id: number, Modified = "2026-11-09T09:00:00+00:00") => ({ Id, Modified });

// QUERY-backed newest-first triggers: LITERAL request + the id each one dedupes on.
const queryCases = [
  { trigger: newTimesheet, object: "Timesheet", sort: { Id: "desc" }, edit: false },
  { trigger: newOrUpdatedTimesheet, object: "Timesheet", sort: { Modified: "desc" }, edit: true },
  { trigger: newLeaveRequest, object: "Leave", sort: { Id: "desc" }, edit: false },
  { trigger: newOrUpdatedLeaveRequest, object: "Leave", sort: { Modified: "desc" }, edit: true },
];

for (const c of queryCases) {
  test(`${c.trigger.key}: seeds, emits only the new item, retries identically, sends the QUERY`, async () => {
    const t = c.trigger;
    const seed = mockCtx([{ body: [T(1)] }], opts);
    const seeded = await t.poll!({ params: {}, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, `${BASE}/${c.object}/QUERY`);
    assertEquals(JSON.parse(seed.calls[0].body!), { sort: c.sort, start: 0, max: 100 });
    const page = [T(2), T(1)];
    const first = await t.poll!(
      { params: {}, state: seeded.nextState },
      mockCtx([{ body: page }], opts).ctx,
    );
    const retry = await t.poll!(
      { params: {}, state: seeded.nextState },
      mockCtx([{ body: page }], opts).ctx,
    );
    assertEquals(first.events, [T(2)]);
    assertEquals(retry, first);
  });
}

for (const c of queryCases.filter((x) => x.edit)) {
  test(`${c.trigger.key}: an edit to an old record is a new event`, async () => {
    const seeded = await c.trigger.poll!(
      { params: {}, state: {} },
      mockCtx([{ body: [T(1), T(2)] }], opts).ctx,
    );
    const edited = T(1, "2026-11-10T08:00:00+00:00");
    const out = await c.trigger.poll!(
      { params: {}, state: seeded.nextState },
      mockCtx([{ body: [edited, T(2)] }], opts).ctx,
    );
    assertEquals(out.events, [edited]);
  });
}

test("the create-order triggers do not re-emit an edited record", async () => {
  const seeded = await newTimesheet.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: [T(1)] }], opts).ctx,
  );
  const out = await newTimesheet.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([{ body: [T(1, "2026-11-10T08:00:00+00:00")] }], opts).ctx,
  );
  assertEquals(out.events, []);
});

const snapshotCases = [
  { trigger: newLocation, object: "Company", a: { Id: 1, CompanyName: "A" }, b: { Id: 2 } },
  { trigger: newArea, object: "OperationalUnit", a: { Id: 1 }, b: { Id: 2, Company: 1 } },
];

for (const c of snapshotCases) {
  test(`${c.trigger.key}: snapshot seeds, emits the added record, retries identically`, async () => {
    const seed = mockCtx([{ body: [c.a] }], opts);
    const seeded = await c.trigger.poll!({ params: {}, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${BASE}/${c.object}`);
    const run = () =>
      c.trigger.poll!(
        { params: {}, state: seeded.nextState },
        mockCtx([{ body: [c.a, c.b] }], opts).ctx,
      );
    const first = await run();
    assertEquals(first.events, [c.b]);
    assertEquals(await run(), first);
  });
}
