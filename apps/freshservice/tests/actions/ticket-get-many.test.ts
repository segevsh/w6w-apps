import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get-many.ts";

Deno.test("ticket-get-many: GETs /tickets and returns the unwrapped array", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { tickets: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets");
  assertEquals(out, { tickets: [{ id: 1 }] });
});

Deno.test("ticket-get-many: maps every filter onto its snake_case query key", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { tickets: [] } }]);
  await action.execute({
    filter: "new_and_my_open",
    requesterEmail: "jo@acme.test",
    type: "Service Request",
    updatedSince: "2026-01-01T00:00:00Z",
    orderType: "asc",
    workspaceId: 2,
    page: 3,
    perPage: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter"), "new_and_my_open");
  assertEquals(url.searchParams.get("email"), "jo@acme.test");
  assertEquals(url.searchParams.get("type"), "Service Request");
  assertEquals(url.searchParams.get("updated_since"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("order_type"), "asc");
  assertEquals(url.searchParams.get("workspace_id"), "2");
  assertEquals(url.searchParams.get("page"), "3");
  assertEquals(url.searchParams.get("per_page"), "50");
});

Deno.test("ticket-get-many: caps per_page at Freshservice's documented 100", () => {
  const perPage = action.params?.find((p) => p.key === "perPage");
  assertEquals(perPage?.validation?.max, 100);
});
