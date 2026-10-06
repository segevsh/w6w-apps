import { assertEquals, assertRejects } from "@std/assert";
import workorderList from "../../actions/workorder-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("workorder-list: GET /v1/workorders, returns workOrders and nextCursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { workOrders: [{ id: 1, title: "Fix" }], nextCursor: "abc", nextPageUrl: "x" },
  }]);
  const out = await workorderList.execute({ limit: 10 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/workorders");
  assertEquals(out, { workOrders: [{ id: 1, title: "Fix" }], nextCursor: "abc" });
});

Deno.test("workorder-list: filters map to the vendor's names, arrays as repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { workOrders: [], nextCursor: null } }]);
  await workorderList.execute({
    statuses: ["OPEN", "IN_PROGRESS"],
    priorities: "HIGH,MEDIUM",
    assets: "4, 5",
    updatedAfter: "2026-01-01T00:00:00.000Z",
    createdBefore: "2026-02-01T00:00:00.000Z",
    sort: "-updatedAt",
    expand: "assignees,asset",
    cursor: "c1",
    organizationId: 9,
  }, ctx);
  assertEquals(queryAll(calls[0].url), {
    statuses: ["OPEN", "IN_PROGRESS"],
    priorities: ["HIGH", "MEDIUM"],
    assets: ["4", "5"],
    "updatedAt[gte]": ["2026-01-01T00:00:00.000Z"],
    "createdAt[lte]": ["2026-02-01T00:00:00.000Z"],
    sort: ["-updatedAt"],
    expand: ["assignees", "asset"],
    cursor: ["c1"],
  });
  assertEquals(calls[0].headers["x-organization-id"], "9");
});

Deno.test("workorder-list: a non-numeric asset id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(workorderList.execute({ assets: "x" }, ctx)),
    Error,
    "numeric id",
  );
  assertEquals(calls.length, 0);
});
