import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-start.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("enrich-start: single contact posts one record with the default field", async () => {
  const { ctx, calls } = mockCtx([{ body: { enrichment_id: "e1" } }]);
  const out = await action.execute!({
    name: "Batch",
    firstName: "John",
    lastName: "Snow",
    domain: "example.com",
    custom: '{"user_id":"1"}',
    webhookUrl: "https://example.com/hook",
    contactFinishedWebhookUrl: "https://example.com/each",
  }, ctx);
  assertEquals(out, { enrichmentId: "e1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/contact/enrich/bulk");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Batch",
    webhook_url: "https://example.com/hook",
    webhook_events: { contact_finished: "https://example.com/each" },
    data: [{
      first_name: "John",
      last_name: "Snow",
      domain: "example.com",
      enrich_fields: ["contact.work_emails"],
      custom: { user_id: "1" },
    }],
  });
});

Deno.test("enrich-start: bulk contacts inherit enrichFields and silentFail is a query flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { enrichment_id: "e2" } }]);
  await action.execute!({
    name: "Bulk",
    enrichFields: ["contact.phones"],
    silentFail: true,
    contacts: JSON.stringify([
      { first_name: "A", last_name: "B", domain: "a.com" },
      { linkedin_url: "https://www.linkedin.com/in/x", enrich_fields: ["contact.personal_emails"] },
    ]),
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("silentFail"), "true");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data[0].enrich_fields, ["contact.phones"]);
  assertEquals(body.data[1].enrich_fields, ["contact.personal_emails"]);
  assertEquals(body.webhook_url, undefined);
});

Deno.test("enrich-start: sends no authorization header and surfaces vendor errors", async () => {
  const ok = mockCtx([{ body: { enrichment_id: "e" } }]);
  await action.execute!({ name: "n" }, ok.ctx);
  assert(!("authorization" in ok.calls[0].headers));
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "error.enrichment.first_name.empty", message: "First name cannot be empty" },
  }]);
  await assertRejects(
    async () => await action.execute!({ name: "n" }, ctx),
    Error,
    "First name cannot be empty (error.enrichment.first_name.empty)",
  );
});
