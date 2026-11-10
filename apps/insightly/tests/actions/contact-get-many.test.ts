import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/contact-get-many.ts";

test("contact-get-many: plain list with no filter", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [{ CONTACT_ID: 1 }] }]);
  const out = await action.execute({ top: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Contacts");
  assertEquals(url.searchParams.get("top"), "10");
  assertEquals(out, { contacts: [{ CONTACT_ID: 1 }] });
});

test("contact-get-many: switches to /Search when a filter field is set", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await action.execute({ fieldName: "EMAIL_ADDRESS", fieldValue: "jo@acme.test" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Contacts/Search");
  assertEquals(url.searchParams.get("field_name"), "EMAIL_ADDRESS");
  assertEquals(url.searchParams.get("field_value"), "jo@acme.test");
});

test("contact-get-many: an updated-after time alone uses /Search without a field filter", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await action.execute({ updatedAfterUtc: "2026-11-09T10:00:00Z", top: 500 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Contacts/Search");
  assertEquals(url.searchParams.get("updated_after_utc"), "2026-11-09T10:00:00Z");
  assertEquals(url.searchParams.get("field_name"), null);
  assertEquals(url.searchParams.get("top"), "500");
});
