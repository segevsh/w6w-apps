import { assertEquals } from "@std/assert";
import adAccountCreate from "../../actions/ad-account-create.ts";
import { createdResponse, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ad-account-create: POSTs with type pinned to BUSINESS and defaults currency to USD", async () => {
  const { ctx, calls } = mockCtx([createdResponse("512352200")]);
  const result = await adAccountCreate.execute({ name: "Company A" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "BUSINESS");
  assertEquals(body.currency, "USD");
  assertEquals(body.name, "Company A");
  assertEquals(result, { id: "512352200" });
});

Deno.test("ad-account-create: is not idempotent — no create-time dedupe key is documented", () => {
  assertEquals(adAccountCreate.idempotent, false);
});

Deno.test("ad-account-create: drops unset optional fields rather than sending them null", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await adAccountCreate.execute({ name: "A" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("reference" in body, false);
  assertEquals("notifiedOnCampaignOptimization" in body, false);
});

Deno.test("ad-account-create: passes through the notification flags and reference when set", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await adAccountCreate.execute(
    { name: "A", reference: "urn:li:organization:2414183", notifiedOnCreativeApproval: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reference, "urn:li:organization:2414183");
  assertEquals(body.notifiedOnCreativeApproval, true);
});
