import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

Deno.test("webhook-create: POSTs the subscription, defaulting eventTypes", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "wh1", url: "https://x.test", isEnabled: true } },
  ]);
  const result = await action.execute({ formId: "f1", url: "https://x.test" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/webhooks");
  assertEquals(jsonBody(calls[0]), {
    formId: "f1",
    url: "https://x.test",
    eventTypes: ["FORM_RESPONSE"],
  });
  assertEquals(result.id, "wh1");
  assertEquals(result.isEnabled, true);
});

Deno.test("webhook-create: forwards the signing secret and custom headers", async () => {
  const headers = [{ name: "X-Token", value: "abc" }];
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    formId: "f1",
    url: "https://x.test",
    signingSecret: "s3cret",
    httpHeaders: headers,
    externalSubscriber: "crm",
  }, ctx);

  assertEquals(jsonBody(calls[0]), {
    formId: "f1",
    url: "https://x.test",
    eventTypes: ["FORM_RESPONSE"],
    signingSecret: "s3cret",
    httpHeaders: headers,
    externalSubscriber: "crm",
  });
});

Deno.test("webhook-create: the signing secret is a secret param", () => {
  assertEquals(action.params?.find((p) => p.key === "signingSecret")?.type, "secret");
});

Deno.test("webhook-create: offers only the event type Tally publishes", () => {
  const eventTypes = action.params?.find((p) => p.key === "eventTypes");
  assertEquals(
    (eventTypes?.options as Array<{ value: string }>).map((o) => o.value),
    ["FORM_RESPONSE"],
  );
});

Deno.test("webhook-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
