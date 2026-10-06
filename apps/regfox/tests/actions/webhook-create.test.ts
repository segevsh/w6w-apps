import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: builds the documented body, defaulting to all forms", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 5, signingSecret: "needed-once" }) }]);
  const out = await exec(action, {
    name: "CRM",
    url: "https://example.com/hook",
    events: "registration, coupon",
    accountId: "1",
    appKey: "k",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    forms: [{ formId: -1 }],
    events: ["registration", "coupon"],
    method: "POST",
    url: "https://example.com/hook",
    typeId: 1,
    status: 1,
    meta: { name: "CRM", appKey: "k" },
    accountId: 1,
  });
  // The one place the secret is returned: the receiver needs it to verify signatures.
  assertEquals((out.webhook as { signingSecret: string }).signingSecret, "needed-once");
  assertEquals(action.idempotent, false);
});

Deno.test("webhook-create: specific form ids become formId objects", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await exec(action, {
    name: "n",
    url: "https://e.test",
    events: "publish",
    formIds: "376,19234",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.forms, [{ formId: 376 }, { formId: 19234 }]);
  assertEquals("accountId" in sent, false);
});

Deno.test("webhook-create: no events or a non-integer form id never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => exec(action, { name: "n", url: "u", events: "" }, ctx));
  await assertRejects(() =>
    exec(action, { name: "n", url: "u", events: "registration", formIds: "abc" }, ctx)
  );
  assertEquals(calls.length, 0);
});
