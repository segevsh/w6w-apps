import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newOrUpdatedInvoice from "../../triggers/new-or-updated-invoice.ts";
import newProject from "../../triggers/new-project.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";
import newTask from "../../triggers/new-task.ts";
import newOrUpdatedTask from "../../triggers/new-or-updated-task.ts";
import newUser from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const API = "https://api.freeagent.com/v2";

const sorted = [
  {
    trigger: newInvoice,
    res: "invoices",
    key: "invoices",
    edit: false,
    qs: "sort=-created_at&page=1&per_page=100",
  },
  {
    trigger: newOrUpdatedInvoice,
    res: "invoices",
    key: "invoices",
    edit: true,
    qs: "sort=-updated_at&page=1&per_page=100",
  },
  {
    trigger: newProject,
    res: "projects",
    key: "projects",
    edit: false,
    qs: "sort=-created_at&page=1&per_page=100",
  },
  {
    trigger: newOrUpdatedProject,
    res: "projects",
    key: "projects",
    edit: true,
    qs: "sort=-updated_at&page=1&per_page=100",
  },
  { trigger: newTask, res: "tasks", key: "tasks", edit: false, qs: "sort=-created_at" },
  { trigger: newOrUpdatedTask, res: "tasks", key: "tasks", edit: true, qs: "sort=-updated_at" },
  { trigger: newUser, res: "users", key: "users", edit: false, qs: "" },
];

for (const c of sorted) {
  const name = c.trigger.key;
  describe(name, () => {
    const row = (id: number, updated = "2026-11-09T10:00:00Z") => ({
      url: `${API}/${c.res}/${id}`,
      created_at: "2026-11-09T10:00:00Z",
      updated_at: updated,
    });
    const ctx = (rows: unknown[]) => mockCtx([{ body: { [c.key]: rows } }]);
    const isSnapshot = name === "new-user";
    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([row(2), row(1)]).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      // A snapshot lists the whole collection in the vendor's order; the others are newest first.
      const page = isSnapshot ? [row(1), row(2), row(3), row(4)] : [row(4), row(3), row(2), row(1)];
      const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
      const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
      assertEquals(first.events, [row(3), row(4)]);
      assertEquals(retry, first);
    });
    test("sends the list action's literal request", async () => {
      const seed = ctx([row(1)]);
      await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, `${API}/${c.res}${c.qs ? "?" + c.qs : ""}`);
    });
    if (c.edit) {
      test("an edited record (new updated_at) is a new event", async () => {
        const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([row(1)]).ctx);
        const edited = row(1, "2026-11-09T11:00:00Z");
        const out = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx([edited]).ctx);
        assertEquals(out.events, [edited]);
      });
    }
    if (isSnapshot) {
      test("an edit is not a new user", async () => {
        const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx([row(1)]).ctx);
        const out = await c.trigger.poll!(
          { ...input, state: seeded.nextState },
          ctx([row(1, "2026-11-09T11:00:00Z")]).ctx,
        );
        assertEquals(out.events, []);
      });
    }
  });
}
