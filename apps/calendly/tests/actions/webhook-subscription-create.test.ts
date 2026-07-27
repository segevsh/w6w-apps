import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-subscription-create.ts";

Deno.test("webhook-subscription-create: omits user for organization scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute(
    {
      url: "https://hook",
      events: ["invitee.created"],
      organization: "org",
      scope: "organization",
      user: "should-be-ignored",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/webhook_subscriptions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://hook",
    events: ["invitee.created"],
    organization: "org",
    scope: "organization",
  });
});

Deno.test("webhook-subscription-create: includes user + signing_key for user scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute(
    {
      url: "https://hook",
      events: ["invitee.created", "invitee.canceled"],
      organization: "org",
      scope: "user",
      user: "usr",
      signingKey: "sk",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://hook",
    events: ["invitee.created", "invitee.canceled"],
    organization: "org",
    scope: "user",
    user: "usr",
    signing_key: "sk",
  });
});
