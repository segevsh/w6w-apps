import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-domains.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-domains: sends filters as query params and maps the page", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        domains: [{ id: 123, domain_name: "example.com", status: true }],
        total: 60,
        page: 1,
        per_page: 25,
        total_pages: 3,
      },
    },
  }]);
  const out = await run(action, {
    search: "exa",
    perPage: 25,
    sortBy: "delivered",
    sortDir: "desc",
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.maileroo.com/v1/domains?search=exa&per_page=25&sort_by=delivered&sort_dir=desc",
  );
  assertEquals(out.domains[0].domain_name, "example.com");
  assertEquals([out.total, out.totalPages, out.hasMore], [60, 3, true]);
});

Deno.test("list-domains: a missing domains.read scope throws", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: { message: "required scope" } } }]);
  await assertRejects(() => run(action, {}, ctx), Error, "required scope");
});
