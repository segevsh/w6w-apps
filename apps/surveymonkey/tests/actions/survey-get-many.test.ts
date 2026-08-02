import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/survey-get-many.ts";

Deno.test("survey-get-many: GETs /surveys mapping filters to snake_case query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], total: 0 } }]);
  await action.execute(
    {
      title: "NPS",
      folderId: "f1",
      startModifiedAt: "2026-01-01T00:00:00",
      include: "response_count",
      page: 2,
      perPage: 50,
      sortBy: "date_modified",
      sortOrder: "DESC",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/surveys");
  assertEquals(url.searchParams.get("title"), "NPS");
  assertEquals(url.searchParams.get("folder_id"), "f1");
  assertEquals(url.searchParams.get("start_modified_at"), "2026-01-01T00:00:00");
  assertEquals(url.searchParams.get("include"), "response_count");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("sort_by"), "date_modified");
  assertEquals(url.searchParams.get("sort_order"), "DESC");
});

Deno.test("survey-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
