import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

Deno.test("webhook-create: POSTs the three required fields", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: { id: 63 } }]);
  await action.execute(
    { event: "lead.creation", targetType: "url", target: "https://my/process" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/webhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    event: "lead.creation",
    target_type: "url",
    target: "https://my/process",
  });
});

Deno.test("webhook-create: maps the optional name", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: {} }]);
  await action.execute({
    event: "lead.creation",
    targetType: "email",
    target: "stef@example.com",
    name: "Lead creation notification",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    event: "lead.creation",
    target_type: "email",
    target: "stef@example.com",
    name: "Lead creation notification",
  });
});

Deno.test("webhook-create: the documented 409 duplicate is surfaced", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 409,
    body: { error: 409, message: "Webhook already exists", type: "already_exist" },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ event: "lead.creation", targetType: "url", target: "https://my/p" }, ctx),
      ),
    Error,
    "already_exist",
  );
});
