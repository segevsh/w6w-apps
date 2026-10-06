import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-send-list.ts";

Deno.test("bulk-send-list: GETs /bulk_sends with page and limit", async () => {
  const body = {
    bulk_sends: [{ id: "b1" }],
    current_page: 2,
    next_page: 3,
    total_count: 25,
    total_pages: 3,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ page: 2, limit: "10" }, ctx);
  assertEquals(out, body);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/bulk_sends");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("bulk-send-list: with no params it sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { bulk_sends: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/bulk_sends");
});

Deno.test("bulk-send-list: forwards user_email and api_application_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { bulk_sends: [] } }]);
  await action.execute!({ user_email: "a@b.test", api_application_id: "app1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("user_email"), "a@b.test");
  assertEquals(url.searchParams.get("api_application_id"), "app1");
});
