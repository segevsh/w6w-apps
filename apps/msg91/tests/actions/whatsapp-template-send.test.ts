import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/whatsapp-template-send.ts";
import { jsonBody, mockCtx, pathOf } from "../_helpers.ts";

const BASE = {
  integratedNumber: "15550236673",
  templateName: "order_update",
  languageCode: "en_US",
};

Deno.test("whatsapp-template-send: POST the bulk endpoint with one to/components entry", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: "Your request is in process",
      status: "success",
      hasError: false,
      request_id: "e03d9f",
    },
  }]);
  const out = await action.execute({
    ...BASE,
    to: "919876543210, 919000000001",
    components: { body_1: { type: "text", value: "Ada" } },
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/whatsapp/whatsapp-outbound-message/bulk/");
  assertEquals(jsonBody(calls[0]), {
    integrated_number: "15550236673",
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "order_update",
        language: { code: "en_US", policy: "deterministic" },
        to_and_components: [{
          to: ["919876543210", "919000000001"],
          components: { body_1: { type: "text", value: "Ada" } },
        }],
      },
    },
  });
  assertEquals(out, { requestId: "e03d9f", message: "Your request is in process" });
});

Deno.test("whatsapp-template-send: per-recipient components override To", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", hasError: false, request_id: "r" },
  }]);
  const tac = [{ to: ["1"], components: {} }, {
    to: ["2"],
    components: { body_1: { type: "text", value: "x" } },
  }];
  await action.execute({ ...BASE, toAndComponents: tac }, ctx);
  const body = jsonBody(calls[0]) as { payload: { template: { to_and_components: unknown } } };
  assertEquals(body.payload.template.to_and_components, tac);
});

Deno.test("whatsapp-template-send: needs a recipient", async () => {
  await assertRejects(async () => await action.execute({ ...BASE }, mockCtx([]).ctx));
});

Deno.test("whatsapp-template-send: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", hasError: false, request_id: "r" },
  }]);
  await action.execute({
    integratedNumber: "9199",
    templateName: "t",
    languageCode: "en",
    to: "9188",
  }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("whatsapp-template-send: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({
      integratedNumber: "9199",
      templateName: "t",
      languageCode: "en",
      to: "9188",
    }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
