import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bulk-enrich-companies.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("bulk-enrich-companies: POSTs {requests} to /v5/company/enrich/bulk", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ status: 200, name: "google" }, { status: 404 }] }]);
  const out = await action.execute!(
    { requests: [{ params: { website: "google.com" } }, { website: "zzz.example" }] } as never,
    ctx,
  ) as { count: number; matches: number };
  assertEquals(new URL(calls[0].url).pathname, "/v5/company/enrich/bulk");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ params: { website: "google.com" } }, { params: { website: "zzz.example" } }],
  });
  assertEquals([out.count, out.matches], [2, 1]);
});

Deno.test("bulk-enrich-companies: an empty list is refused", async () => {
  await assertRejects(
    async () => await action.execute!({ requests: [] } as never, mockCtx([]).ctx),
    Error,
    "non-empty",
  );
});
