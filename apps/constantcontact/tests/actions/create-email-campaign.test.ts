import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-email-campaign.ts";

const required = {
  name: "August newsletter",
  fromName: "Acme",
  fromEmail: "hello@acme.test",
  replyToEmail: "reply@acme.test",
  subject: "Hello",
  htmlContent: "<html><body>hi [[trackingImage]]</body></html>",
};

Deno.test("create-email-campaign: POSTs /v3/emails", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaign_id: "e1", current_status: "Draft" } }]);
  await action.execute!(required, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/emails");
});

Deno.test("create-email-campaign: assembles the one-element email_campaign_activities array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(required, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "August newsletter");
  assertEquals(body.email_campaign_activities.length, 1);
  assertEquals(body.email_campaign_activities[0], {
    format_type: 5,
    from_name: "Acme",
    from_email: "hello@acme.test",
    reply_to_email: "reply@acme.test",
    subject: "Hello",
    html_content: "<html><body>hi [[trackingImage]]</body></html>",
  });
});

Deno.test("create-email-campaign: adds the preheader and footer address when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    ...required,
    preheader: "Read this",
    physicalAddressInFooter: { address_line1: "1 Road", city: "London", country_code: "GB" },
  }, ctx);
  const activity = JSON.parse(calls[0].body!).email_campaign_activities[0];
  assertEquals(activity.preheader, "Read this");
  assertEquals(activity.physical_address_in_footer.city, "London");
});

Deno.test("create-email-campaign: the raw activities escape hatch wins over the lifted fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    ...required,
    emailCampaignActivities: [{ format_type: 5, subject: "Raw" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_campaign_activities, [{ format_type: 5, subject: "Raw" }]);
});

Deno.test("create-email-campaign: is not idempotent — the campaign name must be unique", () => {
  assertEquals(action.idempotent, false);
});
