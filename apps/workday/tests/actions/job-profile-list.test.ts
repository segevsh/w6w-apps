import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-profile-list.ts";

const D = { display: { host: "wd2-impl-services1.workday.com", tenant: "acme_impl1" } };

Deno.test("job-profile-list: calls the documented URL and returns a page", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { total: 1, data: [{ id: "x1", descriptor: "One" }] } }],
    D,
  );
  const result = await action.execute({ "includeInactive": true }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/staffing/v7/acme_impl1/jobProfiles?includeInactive=true",
  );
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(result.items, [{ id: "x1", descriptor: "One" }]);
  assertEquals(result.total, 1);
  assertEquals(result.count, 1);
  assertEquals(result.hasMore, false);
});

Deno.test("job-profile-list: surfaces a Workday error body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "Access denied" } }], D);
  await assertRejects(
    async () => await action.execute({ "includeInactive": true }, ctx),
    Error,
    "Access denied",
  );
});
