import { assert, assertEquals } from "@std/assert";
import subscriptionCreate from "../../actions/subscription-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-create: POSTs to /publications/:id/subscriptions with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: "sub_1", email: "a@b.com", status: "active" } },
  }]);

  const out = await subscriptionCreate.execute({
    publicationId: "pub_1",
    email: "a@b.com",
    reactivateExisting: true,
    doubleOptOverride: "off",
    tier: "premium",
    premiumTiers: "Gold,Silver",
    automationIds: "auto_1",
  }, ctx) as { id: string };

  assertEquals(calls[0].url, "https://api.beehiiv.com/v2/publications/pub_1/subscriptions");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email, "a@b.com");
  assertEquals(sent.reactivate_existing, true);
  assertEquals(sent.double_opt_override, "off");
  assertEquals(sent.tier, "premium");
  assertEquals(sent.premium_tiers, ["Gold", "Silver"]);
  assertEquals(sent.automation_ids, ["auto_1"]);
  assert(!("stripe_customer_id" in sent), "unset fields must not be sent");
  assertEquals(out.id, "sub_1");
});

Deno.test("subscription-create: parses a JSON-array customFields param", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "sub_1" } } }]);
  await subscriptionCreate.execute({
    publicationId: "pub_1",
    email: "a@b.com",
    customFields: '[{"name":"First Name","value":"Bruce"}]',
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.custom_fields, [{ name: "First Name", value: "Bruce" }]);
});

Deno.test("subscription-create: is a non-idempotent perform action", () => {
  assertEquals(subscriptionCreate.type, "perform");
  assertEquals(subscriptionCreate.idempotent, false);
});
