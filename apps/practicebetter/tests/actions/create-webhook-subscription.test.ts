import { assert, assertEquals } from "@std/assert";
import action from "../../actions/create-webhook-subscription.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

const created = {
  id: "sub-9",
  apiVersion: "v1",
  companyId: "co-1",
  endpointUrl: "https://example.com/hook",
  events: ["client.created"],
};

const required = {
  endpointUrl: "https://example.com/hook",
  eventTypes: ["client.created", "client.updated"],
  verificationToken: "handshake-secret",
};

Deno.test("create-webhook-subscription: POSTs to /webhooks/subscription", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const result = await action.execute(required, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/webhooks/subscription`);
  const body = bodyOf(calls[0]);
  assertEquals(body.endpointUrl, "https://example.com/hook");
  assertEquals(body.eventTypes, ["client.created", "client.updated"]);
  assertEquals(body.verificationToken, "handshake-secret");
  assertEquals(result, created);
});

Deno.test("create-webhook-subscription: optional fields are sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await action.execute({
    ...required,
    description: "sync to the CRM",
    autoEnable: true,
    metadata: { tenant: "acme" },
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.description, "sync to the CRM");
  assertEquals(body.autoEnable, true);
  assertEquals(body.metadata, { tenant: "acme" });

  const bare = mockCtx([{ body: created }]);
  await action.execute(required, bare.ctx);
  assertEquals(Object.keys(bodyOf(bare.calls[0])).sort(), [
    "endpointUrl",
    "eventTypes",
    "verificationToken",
  ]);
});

Deno.test("create-webhook-subscription: the scope really is `read`, as the document writes it", () => {
  assert(/`read` scope/.test(action.description!), action.description);
  assert(/read/i.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});

Deno.test("create-webhook-subscription: the handshake and the event-type source are documented", () => {
  const token = action.params!.find((p) => p.key === "verificationToken")!;
  assertEquals(token.type, "secret");
  assertEquals(token.required, true);
  assert(/handshake/.test(token.hint!), token.hint);
  const eventTypes = action.params!.find((p) => p.key === "eventTypes")!;
  assert(/list-webhook-event-types/.test(eventTypes.hint!), eventTypes.hint);
  assertEquals(eventTypes.required, true);
});
