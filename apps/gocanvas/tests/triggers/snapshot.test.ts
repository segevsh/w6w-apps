import { describe, test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { SNAPSHOT_MAX_PAGES } from "../../lib/triggers.ts";
import newForm from "../../triggers/new-form.ts";
import newUser from "../../triggers/new-user.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newSite from "../../triggers/new-site.ts";
import newProject from "../../triggers/new-project.ts";
import newGroup from "../../triggers/new-group.ts";
import newDepartment from "../../triggers/new-department.ts";
import newDepartmentUser from "../../triggers/new-department-user.ts";
import newFormAssignedUser from "../../triggers/new-form-assigned-user.ts";

const rec = (id: number) => ({ id, type: "x", name: `Record ${id}` });
const member = (id: number) => ({ type: "department_user", user: { id }, department_role: "r" });

interface Case {
  name: string;
  t: typeof newForm;
  /** The request the wrapped list action makes (literal, from the vendor docs). */
  path: string;
  params: Record<string, unknown>;
  /** First-page query string the request must carry. */
  search: string;
  paged: boolean;
  item: (id: number) => unknown;
}

const cases: Case[] = [
  {
    name: "new-form",
    t: newForm,
    path: "/api/v3/forms",
    params: {},
    search: "?page=1",
    paged: true,
    item: rec,
  },
  {
    name: "new-user",
    t: newUser,
    path: "/api/v3/users",
    params: {},
    search: "?page=1",
    paged: true,
    item: rec,
  },
  {
    name: "new-customer",
    t: newCustomer,
    path: "/api/v3/customers",
    params: {},
    search: "?page=1",
    paged: true,
    item: rec,
  },
  {
    name: "new-site",
    t: newSite,
    path: "/api/v3/sites",
    params: {},
    search: "?page=1",
    paged: true,
    item: rec,
  },
  {
    name: "new-project",
    t: newProject,
    path: "/api/v3/projects",
    params: {},
    search: "?page=1",
    paged: true,
    item: rec,
  },
  {
    name: "new-group",
    t: newGroup,
    path: "/api/v3/groups",
    params: { departmentId: "21474" },
    search: "?page=1&department_id=21474",
    paged: true,
    item: rec,
  },
  {
    name: "new-group (default department)",
    t: newGroup,
    path: "/api/v3/groups",
    params: {},
    search: "?page=1",
    paged: true,
    item: rec,
  },
  {
    name: "new-department",
    t: newDepartment,
    path: "/api/v3/departments",
    params: {},
    search: "",
    paged: false,
    item: rec,
  },
  {
    name: "new-department-user",
    t: newDepartmentUser,
    path: "/api/v3/departments/1999/users",
    params: { departmentId: "1999" },
    search: "",
    paged: false,
    item: member,
  },
  {
    name: "new-form-assigned-user",
    t: newFormAssignedUser,
    path: "/api/v3/forms/4639578/assigned_users",
    params: { formId: "4639578" },
    search: "",
    paged: false,
    item: rec,
  },
];

const page = (items: unknown[], current = 1, total = 1) => ({
  headers: { "current-page": String(current), "total-pages": String(total), "page-items": "100" },
  body: items,
});
const flat = (items: unknown[]) => ({ body: items });

for (const c of cases) {
  describe(`${c.name} (snapshot poll)`, () => {
    const reply = (items: unknown[]) => (c.paged ? page(items) : flat(items));
    const input = (state: unknown) => ({ params: c.params, state, subscriptionId: "sub-1" });

    test("seed emits nothing and sets the seeded state", async () => {
      const { ctx } = mockCtx([reply([c.item(1), c.item(2)])]);
      const r = await c.t.poll!(input({}), ctx);
      assertEquals(r.events, []);
      assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    });

    test("after the seed, exactly the new record is emitted, and a retry is identical", async () => {
      const seeded = await c.t.poll!(input({}), mockCtx([reply([c.item(1), c.item(2)])]).ctx);
      const run = () =>
        c.t.poll!(input(seeded.nextState), mockCtx([reply([c.item(1), c.item(2), c.item(3)])]).ctx);
      const first = await run();
      assertEquals(first.events, [c.item(3)]);
      assertEquals(await run(), first);
      const again = await c.t.poll!(
        input(first.nextState),
        mockCtx([reply([c.item(1), c.item(2), c.item(3)])]).ctx,
      );
      assertEquals(again.events, []);
    });

    test("requests the same endpoint as the list action", async () => {
      const { ctx, calls } = mockCtx([reply([c.item(1)])]);
      await c.t.poll!(input({}), ctx);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      const u = new URL(calls[0].url);
      assertEquals(u.pathname, c.path);
      assertEquals(u.search, c.search);
    });

    test("declares output and sample, polls, has no subscription hooks", () => {
      assert(c.t.output!.length > 0);
      assert(c.t.sample !== undefined);
      assertEquals(typeof c.t.poll, "function");
      assertEquals(c.t.onSubscribe, undefined);
    });
  });
}

describe("snapshot triggers read every page", () => {
  test("a record on page 2 is found, and page 2 is requested with ?page=2", async () => {
    const seed = mockCtx([page([rec(1)], 1, 2), page([rec(2)], 2, 2)]);
    const seeded = await newUser.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls.map((x) => new URL(x.url).search), ["?page=1", "?page=2"]);
    const next = mockCtx([page([rec(1)], 1, 2), page([rec(2), rec(3)], 2, 2)]);
    const r = await newUser.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "s" },
      next.ctx,
    );
    assertEquals(r.events, [rec(3)]);
  });

  test("an id repeated across pages (list shifted while reading) neither throws nor re-emits", async () => {
    const seeded = await newUser.poll!(
      { params: {}, state: {}, subscriptionId: "s" },
      mockCtx([page([rec(1)], 1, 2), page([rec(2)], 2, 2)]).ctx,
    );
    const r = await newUser.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page([rec(1), rec(2)], 1, 2), page([rec(2)], 2, 2)]).ctx,
    );
    assertEquals(r.events, []);
  });

  test(`more than ${SNAPSHOT_MAX_PAGES} pages throws naming the cap instead of looping`, async () => {
    const pages = Array.from(
      { length: SNAPSHOT_MAX_PAGES },
      (_, i) => page([rec(i + 1)], i + 1, SNAPSHOT_MAX_PAGES + 5),
    );
    await assertRejects(
      () => newUser.poll!({ params: {}, state: {}, subscriptionId: "s" }, mockCtx(pages).ctx),
      Error,
      `more than ${SNAPSHOT_MAX_PAGES} pages`,
    );
  });
});

describe("per-parent snapshot triggers need their parent id", () => {
  for (const t of [newDepartmentUser, newFormAssignedUser]) {
    test(`${t.key}: a missing or non-numeric id is refused before any request`, async () => {
      for (
        const params of [{}, { departmentId: "abc", formId: "abc" }, {
          departmentId: "",
          formId: "",
        }]
      ) {
        const { ctx, calls } = mockCtx([]);
        await assertRejects(
          () => t.poll!({ params, state: {}, subscriptionId: "s" }, ctx),
          Error,
          "must be a number",
        );
        assertEquals(calls.length, 0);
      }
    });

    test(`${t.key}: the parent id is a required string param`, () => {
      const p = t.params!.find((x) => x.key === "departmentId" || x.key === "formId")!;
      assertEquals(p.type, "string");
      assertEquals(p.required, true);
    });
  }
});

test("the snapshot triggers are wired in index.ts", () => {
  const keys = app.triggers.map((t) => t.key);
  for (const c of cases) assert(keys.includes(c.t.key), c.name);
});

describe("snapshot triggers: bounds and identity", () => {
  test("every snapshot trigger checks at most every 10 minutes", () => {
    for (const c of cases) assertEquals(c.t.minIntervalMs, 600_000, c.name);
  });

  test("exactly 50 pages (5000 rows) are accepted; the cap is 50, not one page too small", async () => {
    assertEquals(SNAPSHOT_MAX_PAGES, 50);
    const pages = Array.from({ length: 50 }, (_, i) => page([rec(i + 1)], i + 1, 50));
    const { ctx, calls } = mockCtx(pages);
    const r = await newUser.poll!({ params: {}, state: {}, subscriptionId: "s" }, ctx);
    assertEquals(calls.length, 50);
    assertEquals(new URL(calls[49].url).search, "?page=50");
    assertEquals(r.events, []);
  });

  test("a record without an id is skipped, never keyed as an empty id", async () => {
    const seeded = await newUser.poll!(
      { params: {}, state: {}, subscriptionId: "s" },
      mockCtx([page([rec(1)])]).ctx,
    );
    const r = await newUser.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page([rec(1), { type: "x", name: "no id" }, { id: null }, rec(2)])]).ctx,
    );
    assertEquals(r.events, [rec(2)]);
  });
});

describe("new-form keys on the form, not on its version", () => {
  const form = (id: number, root: number | null | undefined, version = 1) => ({
    id,
    type: "form",
    version,
    ...(root === undefined ? {} : { root_version_id: root }),
  });
  const run = (state: unknown, items: unknown[]) =>
    newForm.poll!({ params: {}, state, subscriptionId: "s" }, mockCtx([page(items)]).ctx);

  test("a republished form (new version id, same root_version_id) does not fire again", async () => {
    const seeded = await run({}, [form(346127, 346127)]);
    const r = await run(seeded.nextState, [
      form(5000001, 346127, 2),
      form(346127, 346127),
      form(5000009, 5000009),
    ]);
    assertEquals(r.events, [form(5000009, 5000009)]);
  });

  test("the same version showing up again is not new either, and a retry is identical", async () => {
    const seeded = await run({}, [form(1, 1), form(2, 2)]);
    const first = await run(seeded.nextState, [form(1, 1), form(2, 2), form(3, 3)]);
    assertEquals(first.events, [form(3, 3)]);
    assertEquals(await run(seeded.nextState, [form(1, 1), form(2, 2), form(3, 3)]), first);
    assertEquals((await run(first.nextState, [form(1, 1), form(2, 2), form(3, 3)])).events, []);
  });

  test("a form without a root_version_id (or a null one) falls back to its id", async () => {
    const seeded = await run({}, [form(10, undefined)]);
    const r = await run(seeded.nextState, [
      form(10, undefined),
      form(11, null),
      form(12, undefined),
    ]);
    assertEquals(r.events, [form(11, null), form(12, undefined)]);
    const again = await run(r.nextState, [form(10, null), form(11, undefined)]);
    assertEquals(again.events, []);
  });
});
