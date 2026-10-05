import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-list.ts";

const D = { display: { host: "wd2-impl-services1.workday.com", tenant: "acme_impl1" } };

Deno.test("worker-list: calls the documented URL and returns a page", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { total: 1, data: [{ id: "x1", descriptor: "One" }] } }],
    D,
  );
  const result = await action.execute({
    "search": "ana lopez",
    "email": "a@x.io",
    "includeTerminated": true,
    "filterByOrgVisibility": false,
    "limit": 5,
    "offset": 10,
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/staffing/v7/acme_impl1/workers?search=ana+lopez&email=a%40x.io&includeTerminatedWorkers=true&filterByOrgVisibility=false&limit=5&offset=10",
  );
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(result.items, [{ id: "x1", descriptor: "One" }]);
  assertEquals(result.total, 1);
  assertEquals(result.count, 1);
  assertEquals(result.hasMore, false);
});

Deno.test("worker-list: surfaces a Workday error body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "Access denied" } }], D);
  await assertRejects(
    async () =>
      await action.execute({
        "search": "ana lopez",
        "email": "a@x.io",
        "includeTerminated": true,
        "filterByOrgVisibility": false,
        "limit": 5,
        "offset": 10,
      }, ctx),
    Error,
    "Access denied",
  );
});

Deno.test("worker-list: a limit above Workday's maximum is refused", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({ limit: 101 }, ctx), Error, "1 to 100");
  assertEquals(calls.length, 0);
});

Deno.test("worker-list: reports hasMore from total and offset", async () => {
  const body = { total: 45, data: [{ id: "a" }, { id: "b" }] };
  const more = await action.execute({ limit: 2, offset: 40 }, mockCtx([{ body }], D).ctx);
  assertEquals((more as Record<string, unknown>).hasMore, true);
  const last = await action.execute(
    { limit: 2, offset: 43 },
    mockCtx([{ body: { ...body, total: 45 } }], D).ctx,
  );
  assertEquals((last as Record<string, unknown>).hasMore, false);
});
