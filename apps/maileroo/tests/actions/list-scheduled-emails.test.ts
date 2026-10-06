import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-scheduled-emails.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-scheduled-emails: maps the page envelope and hasMore", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      data: {
        page: 1,
        per_page: 10,
        results: [{ reference_id: "r" }],
        total_count: 14,
        total_pages: 2,
      },
    },
  }]);
  const out = await run(action, { domain: " example.com ", perPage: 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://smtp.maileroo.com/api/v2/emails/scheduled?domain=example.com&per_page=10",
  );
  assertEquals(out, {
    results: [{ reference_id: "r" }],
    page: 1,
    perPage: 10,
    totalCount: 14,
    totalPages: 2,
    hasMore: true,
  });
});

Deno.test("list-scheduled-emails: an app-scoped key without a domain is the vendor's 400", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { data: null, success: false, message: "must provide a linked domain." },
  }]);
  await assertRejects(() => run(action, {}, ctx), Error, "linked domain");
});
