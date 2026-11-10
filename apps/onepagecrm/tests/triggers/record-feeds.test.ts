import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import newCompany from "../../triggers/new-company.ts";
import newDeal from "../../triggers/new-deal.ts";
import newNote from "../../triggers/new-note.ts";
import newAction from "../../triggers/new-action.ts";
import updatedCompany from "../../triggers/new-or-updated-company.ts";
import updatedContact from "../../triggers/new-or-updated-contact.ts";
import updatedDeal from "../../triggers/new-or-updated-deal.ts";

const cases = [
  {
    trigger: newCompany,
    list: "companies",
    wrap: "company",
    path: "/api/v3/companies",
    sort: "created_at",
  },
  { trigger: newDeal, list: "deals", wrap: "deal", path: "/api/v3/deals", sort: "created_at" },
  { trigger: newNote, list: "notes", wrap: "note", path: "/api/v3/notes", sort: "created_at" },
  {
    trigger: newAction,
    list: "actions",
    wrap: "action",
    path: "/api/v3/actions",
    sort: "created_at",
  },
];

for (const c of cases) {
  test(`${c.trigger.key}: seeds, emits the new record, retries idempotently, literal newest-first request`, async () => {
    const rec = (id: string) => ({ [c.wrap]: { id } });
    const seed = mockCtx([{ body: listEnvelope(c.list, [rec("r1")]) }]);
    const seeded = await c.trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    const page = [{ body: listEnvelope(c.list, [rec("r2"), rec("r1")]) }];
    const out = await c.trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx(page).ctx,
    );
    assertEquals(out.events, [rec("r2")]);
    assertEquals(
      await c.trigger.poll!({ params: {}, state: seeded.nextState } as never, mockCtx(page).ctx),
      out,
    );
    const url = new URL(seed.calls[0].url);
    assertEquals(
      {
        method: seed.calls[0].method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
      },
      {
        method: "GET",
        path: c.path,
        query: { sort_by: c.sort, order: "desc", page: "1", per_page: "100" },
      },
    );
  });
}

const updated = [
  { trigger: updatedCompany, list: "companies", wrap: "company", path: "/api/v3/companies" },
  { trigger: updatedContact, list: "contacts", wrap: "contact", path: "/api/v3/contacts" },
  { trigger: updatedDeal, list: "deals", wrap: "deal", path: "/api/v3/deals" },
];

for (const c of updated) {
  test(`${c.trigger.key}: an edited record fires again once; literal modified_at request`, async () => {
    const rec = (id: string, at: string) => ({ [c.wrap]: { id, modified_at: at } });
    const seed = mockCtx([{
      body: listEnvelope(c.list, [
        rec("r1", "2026-11-10T08:00:00Z"),
        rec("r0", "2026-11-09T08:00:00Z"),
      ]),
    }]);
    const seeded = await c.trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
    assertEquals(seeded.events, []);
    const page = [{
      body: listEnvelope(c.list, [
        rec("r0", "2026-11-10T09:00:00Z"),
        rec("r1", "2026-11-10T08:00:00Z"),
      ]),
    }];
    const out = await c.trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx(page).ctx,
    );
    assertEquals(out.events, [rec("r0", "2026-11-10T09:00:00Z")]);
    assertEquals(
      await c.trigger.poll!({ params: {}, state: seeded.nextState } as never, mockCtx(page).ctx),
      out,
    );
    const again = await c.trigger.poll!(
      { params: {}, state: out.nextState } as never,
      mockCtx(page).ctx,
    );
    assertEquals(again.events, []);
    const url = new URL(seed.calls[0].url);
    assertEquals(
      {
        method: seed.calls[0].method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
      },
      {
        method: "GET",
        path: c.path,
        query: { sort_by: "modified_at", order: "desc", page: "1", per_page: "100" },
      },
    );
  });
}
