import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { MockResponse } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newReport from "../../triggers/new-report.ts";
import newWorkspace from "../../triggers/new-workspace.ts";
import newUser from "../../triggers/new-user.ts";
import newColumn from "../../triggers/new-column.ts";
import newContainerItem from "../../triggers/new-container-item.ts";

const B = "https://api.smartsheet.com/2.0";
const paged = (data: unknown[], totalPages = 1): MockResponse => ({
  body: { data, pageNumber: 1, totalPages },
});
const tokened = (data: unknown[], lastKey?: string): MockResponse => ({
  body: lastKey ? { data, lastKey } : { data },
});

interface Case {
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  /** The literal first request. */
  url: string;
  /** The literal second request, when the first response says there is more. */
  url2: string;
  respond(rows: unknown[], more?: boolean): MockResponse;
  /** A response that always says there is another page. */
  endless(rows: unknown[]): MockResponse;
  row(n: number): Record<string, unknown>;
}

const CASES: Case[] = [
  {
    trigger: newReport,
    params: {},
    url: `${B}/reports?page=1&pageSize=100`,
    url2: `${B}/reports?page=2&pageSize=100`,
    respond: (rows, more) => paged(rows, more ? 2 : 1),
    endless: (rows) => paged(rows, 99),
    row: (n) => ({ id: n, name: `report ${n}`, accessLevel: "OWNER" }),
  },
  {
    trigger: newUser,
    params: {},
    url: `${B}/users?page=1&pageSize=100`,
    url2: `${B}/users?page=2&pageSize=100`,
    respond: (rows, more) => paged(rows, more ? 2 : 1),
    endless: (rows) => paged(rows, 99),
    row: (n) => ({ id: n, email: `u${n}@example.com`, status: "ACTIVE" }),
  },
  {
    trigger: newColumn,
    params: { sheetId: "123" },
    url: `${B}/sheets/123/columns?page=1&pageSize=100`,
    url2: `${B}/sheets/123/columns?page=2&pageSize=100`,
    respond: (rows, more) => paged(rows, more ? 2 : 1),
    endless: (rows) => paged(rows, 99),
    row: (n) => ({ id: n, title: `col ${n}`, type: "TEXT_NUMBER" }),
  },
  {
    trigger: newWorkspace,
    params: {},
    url: `${B}/workspaces?maxItems=100`,
    url2: `${B}/workspaces?maxItems=100&lastKey=k1`,
    respond: (rows, more) => tokened(rows, more ? "k1" : undefined),
    endless: (rows) => tokened(rows, "k1"),
    row: (n) => ({ id: n, name: `workspace ${n}` }),
  },
  {
    trigger: newContainerItem,
    params: { container: "workspace", containerId: "55" },
    url: `${B}/workspaces/55/children?maxItems=100`,
    url2: `${B}/workspaces/55/children?maxItems=100&lastKey=k1`,
    respond: (rows, more) => tokened(rows, more ? "k1" : undefined),
    endless: (rows) => tokened(rows, "k1"),
    row: (n) => ({ id: n, resourceType: "sheet", name: `item ${n}` }),
  },
];

for (const c of CASES) {
  const key = c.trigger.key;
  const run = (state: unknown, rs: MockResponse[], params = c.params) => {
    const m = mockCtx(rs);
    return c.trigger.poll!({ params, state, subscriptionId: "sub-1" }, m.ctx).then((r) => ({
      ...r,
      calls: m.calls,
    }));
  };

  test(`${key}: seeds without flooding and sends the literal request`, async () => {
    const seeded = await run({}, [c.respond([c.row(1)])]);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seeded.calls.length, 1);
    assertEquals(seeded.calls[0].method, "GET");
    assertEquals(seeded.calls[0].url, c.url);
  });

  test(`${key}: emits only the added row; a retry gives the same result`, async () => {
    const seeded = await run({}, [c.respond([c.row(1)])]);
    const first = await run(seeded.nextState, [c.respond([c.row(1), c.row(2)])]);
    const retry = await run(seeded.nextState, [c.respond([c.row(1), c.row(2)])]);
    assertEquals(first.events, [c.row(2)]);
    assertEquals(retry.events, first.events);
    assertEquals(retry.nextState, first.nextState);
  });

  test(`${key}: reads the next page and emits a row found there`, async () => {
    const seeded = await run({}, [c.respond([c.row(1)], true), c.respond([c.row(2)])]);
    assertEquals(seeded.calls.length, 2);
    assertEquals(seeded.calls[1].url, c.url2);
    const next = await run(seeded.nextState, [
      c.respond([c.row(1)], true),
      c.respond([c.row(2), c.row(3)]),
    ]);
    assertEquals(next.events, [c.row(3)]);
  });

  test(`${key}: a list of more than 1000 rows is refused, not truncated`, async () => {
    const rows = Array.from({ length: 100 }, (_, i) => c.row(i + 1));
    await assertRejects(() => run({}, Array.from({ length: 10 }, () => c.endless(rows))));
  });
}

test("new-container-item: a folder reads /folders/{id}/children; ids are keyed with the resource type", async () => {
  const params = { container: "folder", containerId: "77" };
  const m = mockCtx([tokened([{ id: 1, resourceType: "sheet" }])]);
  const seeded = await newContainerItem.poll!({ params, state: {}, subscriptionId: "s" }, m.ctx);
  assertEquals(m.calls[0].url, `${B}/folders/77/children?maxItems=100`);
  const next = await newContainerItem.poll!(
    { params, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([tokened([{ id: 1, resourceType: "sheet" }, { id: 1, resourceType: "report" }])]).ctx,
  );
  assertEquals(next.events, [{ id: 1, resourceType: "report" }]);
});
