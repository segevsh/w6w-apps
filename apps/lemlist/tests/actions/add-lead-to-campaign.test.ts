import { assertEquals } from "@std/assert";
import addLeadToCampaign from "../../actions/add-lead-to-campaign.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("add-lead-to-campaign: POSTs to /campaigns/{id}/leads/ WITH the trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addLeadToCampaign.execute!({ campaignId: "cam_1", email: "a@b.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/campaigns/cam_1/leads/");
});

Deno.test("add-lead-to-campaign: sends the standard fields in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addLeadToCampaign.execute!({
    campaignId: "cam_1",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    companyName: "Acme",
    jobTitle: "Growth Engineer",
    linkedinUrl: "https://www.linkedin.com/in/johndoe",
    phone: "+33123456789",
    companyDomain: "acme.com",
    icebreaker: "Loved your talk",
    timezone: "Europe/Paris",
    contactOwner: "owner@example.com",
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    companyName: "Acme",
    jobTitle: "Growth Engineer",
    linkedinUrl: "https://www.linkedin.com/in/johndoe",
    phone: "+33123456789",
    companyDomain: "acme.com",
    icebreaker: "Loved your talk",
    timezone: "Europe/Paris",
    contactOwner: "owner@example.com",
  });
});

Deno.test("add-lead-to-campaign: omits fields the caller did not set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addLeadToCampaign.execute!({ campaignId: "cam_1", email: "a@b.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("add-lead-to-campaign: flattens custom variables onto the body, not under a key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addLeadToCampaign.execute!({
    campaignId: "cam_1",
    email: "a@b.com",
    customVariables: { companySize: "50-100", customVariable1: "any value" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.companySize, "50-100");
  assertEquals(body.customVariable1, "any value");
  assertEquals(body.customVariables, undefined, "must not nest under a wrapper key");
});

Deno.test("add-lead-to-campaign: the enrichment flags are QUERY params, not body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addLeadToCampaign.execute!({
    campaignId: "cam_1",
    email: "a@b.com",
    deduplicate: true,
    linkedinEnrichment: true,
    findEmail: true,
    verifyEmail: true,
    findPhone: true,
  }, ctx);

  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("deduplicate"), "true");
  assertEquals(p.get("linkedinEnrichment"), "true");
  assertEquals(p.get("findEmail"), "true");
  assertEquals(p.get("verifyEmail"), "true");
  assertEquals(p.get("findPhone"), "true");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("add-lead-to-campaign: sends no enrichment flags by default — they cost credits", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await addLeadToCampaign.execute!({ campaignId: "cam_1", email: "a@b.com" }, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("add-lead-to-campaign: is a non-idempotent perform — lemlist has no idempotency key", () => {
  assertEquals(addLeadToCampaign.type, "perform");
  assertEquals(addLeadToCampaign.idempotent, false);
});
