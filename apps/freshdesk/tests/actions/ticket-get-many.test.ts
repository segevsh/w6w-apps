import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get-many.ts";

Deno.test("ticket-get-many: GETs /tickets and wraps the array as { tickets }", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/tickets");
  assertEquals(out, { tickets: [{ id: 1 }, { id: 2 }] });
});

Deno.test("ticket-get-many: passes filters and pagination through as query params", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: [] }]);
  await action.execute(
    { requesterEmail: "jo@acme.test", companyId: 3, page: 2, perPage: 50 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("email"), "jo@acme.test");
  assertEquals(url.searchParams.get("company_id"), "3");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
});
