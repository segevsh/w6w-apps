import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-get-many.ts";

Deno.test("contact-get-many: GETs /contacts and wraps the array as { contacts }", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: [{ id: 1 }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/contacts");
  assertEquals(out, { contacts: [{ id: 1 }] });
});

Deno.test("contact-get-many: passes filters through as query params", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: [] }]);
  await action.execute({ email: "jo@acme.test", companyId: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("email"), "jo@acme.test");
  assertEquals(url.searchParams.get("company_id"), "2");
});
