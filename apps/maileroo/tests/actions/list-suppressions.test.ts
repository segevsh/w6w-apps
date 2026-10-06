import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-suppressions.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-suppressions: maps rows and paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        suppressions: [{ id: 456, email_address: "a@x.com", reason: "Manually added" }],
        total: 1,
        page: 1,
        per_page: 25,
        total_pages: 1,
      },
    },
  }]);
  const out = await run(action, { search: "a@x" }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/suppressions?search=a%40x");
  assertEquals(out.suppressions[0].reason, "Manually added");
  assertEquals(out.hasMore, false);
});

Deno.test("list-suppressions: errors throw", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { message: "revoked" } } }]);
  await assertRejects(() => run(action, {}, ctx), Error, "revoked");
});
