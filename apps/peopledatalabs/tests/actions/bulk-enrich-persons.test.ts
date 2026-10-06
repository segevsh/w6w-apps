import { assertEquals, assertRejects } from "@std/assert";
import action, { normalizeRequests } from "../../actions/bulk-enrich-persons.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("bulk-enrich-persons: POSTs {requests} and counts the 200 entries", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { status: 200, likelihood: 9, data: { id: "a" }, metadata: { row: 1 } },
      { status: 404, error: { type: "not_found" } },
    ],
  }]);
  const out = await action.execute!(
    {
      requests: '[{"params":{"email":"a@b.com"},"metadata":{"row":1}},{"email":"c@d.com"}]',
      required: "emails",
      include_if_matched: true,
    } as never,
    ctx,
  ) as { count: number; matches: number; results: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/v5/person/bulk");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ params: { email: "a@b.com" }, metadata: { row: 1 } }, {
      params: { email: "c@d.com" },
    }],
    required: "emails",
    include_if_matched: true,
  });
  assertEquals(out.count, 2);
  assertEquals(out.matches, 1);
});

Deno.test("bulk-enrich-persons: refuses an empty, oversized or malformed request list", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ requests: "[]" } as never, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await action.execute!({ requests: "nope" } as never, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(
    normalizeRequests(Array.from({ length: 100 }, () => ({ email: "a@b.c" }))).length,
    100,
  );
  await assertRejects(
    async () =>
      await action.execute!({ requests: Array.from({ length: 101 }, () => ({})) } as never, ctx),
    Error,
    "at most 100",
  );
});
