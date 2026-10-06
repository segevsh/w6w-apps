import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-verifications.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-verifications: filters become query params; cursor drives hasMore", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { items: [{ id: "vrf_1" }], next_cursor: "cur2", total: 80 } },
  }]);
  const out = await run(action, {
    status: "verified",
    channel: "sms",
    createdAfter: "2025-01-01T00:00:00Z",
    limit: 50,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.maileroo.com/v1/verify/verifications?status=verified&channel=sms&created_after=2025-01-01T00%3A00%3A00Z&limit=50",
  );
  assertEquals(out, { items: [{ id: "vrf_1" }], nextCursor: "cur2", hasMore: true, total: 80 });
});

Deno.test("list-verifications: a null cursor ends paging; a bad filter is the vendor's 400", async () => {
  const end = await run(
    action,
    { cursor: "cur2" },
    mockCtx([{ body: { data: { items: [], next_cursor: null, total: 0 } } }]).ctx,
  );
  assertEquals([end.nextCursor, end.hasMore], [null, false]);
  await assertRejects(
    () =>
      run(
        action,
        { status: "bogus" },
        mockCtx([{ status: 400, body: { error: { message: "invalid status" } } }]).ctx,
      ),
    Error,
    "invalid status",
  );
});
