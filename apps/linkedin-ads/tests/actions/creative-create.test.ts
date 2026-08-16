import { assertEquals } from "@std/assert";
import creativeCreate from "../../actions/creative-create.ts";
import { createdResponse, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("creative-create: POSTs content.reference, campaign URN, and defaults intendedStatus to DRAFT", async () => {
  const { ctx, calls } = mockCtx([createdResponse("urn:li:sponsoredCreative:120491345")]);
  const result = await creativeCreate.execute(
    {
      accountId: "520866471",
      campaignId: "360035215",
      contentReference: "urn:li:ugcPost:6778045555198214144",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/520866471/creatives");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign, "urn:li:sponsoredCampaign:360035215");
  assertEquals(body.content, { reference: "urn:li:ugcPost:6778045555198214144" });
  assertEquals(body.intendedStatus, "DRAFT");
  assertEquals(result, { id: "urn:li:sponsoredCreative:120491345" });
});

Deno.test("creative-create: name is included only when set", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await creativeCreate.execute(
    { accountId: "1", campaignId: "2", contentReference: "urn:li:share:1", name: "Q4 push" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).name, "Q4 push");
});

Deno.test("creative-create: is not idempotent", () => {
  assertEquals(creativeCreate.idempotent, false);
});
