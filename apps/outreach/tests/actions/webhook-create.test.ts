import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const created = {
  data: {
    type: "webhook",
    id: 1,
    attributes: {
      action: "completed",
      resource: "task",
      url: "https://foo.bar/webhooks",
      secret: "abcd1234",
      cleanupToken: "eyJh.cleanup",
      payloadVersion: 2,
    },
  },
};

Deno.test("webhook-create: POSTs a webhook with resource, action, url and secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  await webhookCreate.execute({
    url: "https://foo.bar/webhooks",
    resource: "task",
    action: "completed",
    secret: "abcd1234",
    payloadVersion: 2,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks");
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "webhook",
      attributes: {
        url: "https://foo.bar/webhooks",
        resource: "task",
        action: "completed",
        secret: "abcd1234",
        payloadVersion: 2,
      },
    },
  });
});

Deno.test("webhook-create: the response never carries the secret or the cleanup token", async () => {
  const { ctx } = mockCtx([{ status: 201, body: structuredClone(created) }]);
  const out = await webhookCreate.execute({ url: "https://foo.bar/webhooks" }, ctx);
  const text = JSON.stringify(out);
  assertEquals(text.includes("abcd1234"), false);
  assertEquals(text.includes("cleanup"), false);
  assertEquals(
    (out as { data: { attributes: Record<string, unknown> } }).data.attributes.url,
    "https://foo.bar/webhooks",
  );
});

Deno.test("webhook-create: resource and action default to the wildcard", () => {
  const defaults = webhookCreate.params!.filter((p) => ["resource", "action"].includes(p.key))
    .map((p) => p.default);
  assertEquals(defaults, ["*", "*"]);
});
