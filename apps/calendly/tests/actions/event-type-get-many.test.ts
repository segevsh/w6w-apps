import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-type-get-many.ts";

Deno.test("event-type-get-many: GETs /event_types with mapped query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute(
    { user: "https://api.calendly.com/users/AAAA", active: true, count: 50 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/event_types");
  assertEquals(url.searchParams.get("user"), "https://api.calendly.com/users/AAAA");
  assertEquals(url.searchParams.get("active"), "true");
  assertEquals(url.searchParams.get("count"), "50");
  assertEquals(calls[0].method, "GET");
});

Deno.test("event-type-get-many: maps pageToken to page_token", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute({ organization: "org", pageToken: "next" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("organization"), "org");
  assertEquals(url.searchParams.get("page_token"), "next");
});
