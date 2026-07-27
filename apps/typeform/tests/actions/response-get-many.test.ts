import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-get-many.ts";

Deno.test("response-get-many: GETs /forms/{id}/responses with mapped query", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], total_items: 0 } }]);
  await action.execute(
    {
      formId: "abc",
      pageSize: 100,
      since: "2026-01-01T00:00:00Z",
      responseType: "completed",
      query: "spam",
      sort: "submitted_at,desc",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/abc/responses");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(url.searchParams.get("since"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("response_type"), "completed");
  assertEquals(url.searchParams.get("query"), "spam");
  assertEquals(url.searchParams.get("sort"), "submitted_at,desc");
});

Deno.test("response-get-many: sends only the form id path when unfiltered", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ formId: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/abc/responses");
  assertEquals(url.search, "");
});
