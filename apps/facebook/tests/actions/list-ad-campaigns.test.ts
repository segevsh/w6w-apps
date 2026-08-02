import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-ad-campaigns.ts";

Deno.test("list-ad-campaigns: GETs /{adAccountId}/campaigns with default fields", async () => {
  const body = { data: [{ id: "camp-1", name: "Spring Sale" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ adAccountId: "act_12345" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/act_12345/campaigns");
  assertEquals(
    url.searchParams.get("fields"),
    "id,name,status,objective,effective_status,created_time",
  );
  assertEquals(result, body);
});

Deno.test("list-ad-campaigns: honours a custom fields override and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!(
    { adAccountId: "act_12345", fields: "id,name", cursor: "abc", limit: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "id,name");
  assertEquals(url.searchParams.get("after"), "abc");
  assertEquals(url.searchParams.get("limit"), "5");
});
