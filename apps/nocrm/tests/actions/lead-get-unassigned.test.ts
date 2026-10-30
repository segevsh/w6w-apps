import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-get-unassigned.ts";

test("lead-get-unassigned: GETs /leads/unassigned with a limit", async () => {
  const { ctx, calls } = mockNocrmCtx([{
    body: [{ id: 8113 }],
    headers: { "content-type": "application/json", "x-total-count": "3" },
  }]);
  const page = await action.execute({ limit: 10 }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/unassigned?limit=10");
  assertEquals(calls[0].method, "GET");
  assertEquals(page.items, [{ id: 8113 }]);
  assertEquals(page.totalCount, 3);
});

test("lead-get-unassigned: declares no offset, matching the vendor's table", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/unassigned");
});

test("lead-get-unassigned: reports the vendor's type when the endpoint refuses", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 403,
    body: { error: 403, message: "Forbidden", type: "forbidden_action" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({}, ctx)),
    Error,
    "forbidden_action",
  );
});
