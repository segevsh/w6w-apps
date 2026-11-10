import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newLead from "../../triggers/new-lead.ts";
import updatedLead from "../../triggers/new-or-updated-lead.ts";
import newContact from "../../triggers/new-contact.ts";
import newTask from "../../triggers/new-task.ts";
import newActivity from "../../triggers/new-activity.ts";
import newUser from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const page = (data: unknown[], more = false) => ({ body: { data, has_more: more } });
const req = (call: { method: string; url: string; body: string | null }) => ({
  method: call.method,
  path: new URL(call.url).pathname,
  query: Object.fromEntries(new URL(call.url).searchParams),
  body: call.body === null ? null : JSON.parse(call.body),
});

describe("newest-first lists", () => {
  const cases = [
    {
      name: "new-contact",
      trigger: newContact,
      expected: {
        method: "GET",
        path: "/api/v1/contact/",
        query: { _limit: "100", _skip: "0" },
        body: null,
      },
    },
    {
      name: "new-task",
      trigger: newTask,
      expected: {
        method: "GET",
        path: "/api/v1/task/",
        query: { _limit: "100", _skip: "0", _order_by: "-date_created" },
        body: null,
      },
    },
    {
      name: "new-activity",
      trigger: newActivity,
      expected: {
        method: "GET",
        path: "/api/v1/activity/",
        query: { _limit: "100", _skip: "0", _order_by: "-date_created" },
        body: null,
      },
    },
    {
      name: "new-lead",
      trigger: newLead,
      expected: {
        method: "POST",
        path: "/api/v1/data/search/",
        query: {},
        body: {
          query: { type: "and", queries: [{ type: "object_type", object_type: "lead" }] },
          _limit: 100,
          _fields: { lead: ["id", "display_name", "status_label", "date_created"] },
          sort: [{
            direction: "desc",
            field: { type: "regular_field", object_type: "lead", field_name: "date_created" },
          }],
        },
      },
    },
  ] as const;
  for (const c of cases) {
    test(`${c.name}: seeds, emits only the new record, retries idempotently, sends the literal sorted request`, async () => {
      const seed = mockCtx([page([{ id: "a" }])]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(req(seed.calls[0]), c.expected);
      const next = page([{ id: "b" }, { id: "a" }]);
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([next]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([next]).ctx,
      );
      assertEquals(first.events, [{ id: "b" }]);
      assertEquals(retry, first);
    });
  }
});

describe("new-or-updated-lead (most recently updated first)", () => {
  const lead = (id: string, updated: string) => ({ id, date_updated: updated });
  test("an edit is a new event; an unchanged lead is not; requests the plain lead list", async () => {
    const seed = mockCtx([page([lead("a", "1")])]);
    const seeded = await updatedLead.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(req(seed.calls[0]), {
      method: "GET",
      path: "/api/v1/lead/",
      query: { _limit: "100", _skip: "0" },
      body: null,
    });
    const next = page([lead("a", "2"), lead("a", "1")]);
    const first = await updatedLead.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([next]).ctx,
    );
    const retry = await updatedLead.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([next]).ctx,
    );
    assertEquals(first.events, [lead("a", "2")]);
    assertEquals(retry, first);
    const same = await updatedLead.poll!({ ...input, state: first.nextState }, mockCtx([next]).ctx);
    assertEquals(same.events, []);
  });
});

describe("new-user (bounded snapshot)", () => {
  test("seeds, emits only the added user, ignores edits, retries idempotently", async () => {
    const seed = mockCtx([page([{ id: "u1", email: "a@example.com" }])]);
    const seeded = await newUser.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(req(seed.calls[0]), {
      method: "GET",
      path: "/api/v1/user/",
      query: { _limit: "100", _skip: "0" },
      body: null,
    });
    const next = page([{ id: "u1", email: "changed@example.com" }, { id: "u2" }]);
    const first = await newUser.poll!({ ...input, state: seeded.nextState }, mockCtx([next]).ctx);
    const retry = await newUser.poll!({ ...input, state: seeded.nextState }, mockCtx([next]).ctx);
    assertEquals(first.events, [{ id: "u2" }]);
    assertEquals(retry, first);
  });

  test("reads every page of a team larger than one page", async () => {
    const many = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `u${from + i}` }));
    const m = mockCtx([page(many(0, 100), true), page(many(100, 3))]);
    await newUser.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 2);
    assertEquals(req(m.calls[1]).query, { _limit: "100", _skip: "100" });
  });
});
