import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-work-phone-list.ts";

const D = { display: { host: "wd2-impl-services1.workday.com", tenant: "acme_impl1" } };

Deno.test("person-work-phone-list: calls the documented URL and returns a page", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { total: 1, data: [{ id: "x1", descriptor: "One" }] } }],
    D,
  );
  const result = await action.execute({
    "personId": "a3f1c2d4e5b6478990a1b2c3d4e5f607",
    "usedFor": "u1",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/person/v4/acme_impl1/people/a3f1c2d4e5b6478990a1b2c3d4e5f607/workPhones?usedFor=u1",
  );
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(result.items, [{ id: "x1", descriptor: "One" }]);
  assertEquals(result.total, 1);
  assertEquals(result.count, 1);
  assertEquals(result.hasMore, false);
});

Deno.test("person-work-phone-list: surfaces a Workday error body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "Access denied" } }], D);
  await assertRejects(
    async () =>
      await action.execute(
        { "personId": "a3f1c2d4e5b6478990a1b2c3d4e5f607", "usedFor": "u1" },
        ctx,
      ),
    Error,
    "Access denied",
  );
});
