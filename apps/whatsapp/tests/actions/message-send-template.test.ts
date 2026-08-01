import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-template.ts";

const OK = { messaging_product: "whatsapp", messages: [{ id: "wamid.2" }] };

Deno.test("message-send-template: POSTs name + language, with no components key when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await action.execute(
    { to: "1", templateName: "hello_world", languageCode: "en_US" },
    ctx,
  );
  assertEquals(out, OK);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "template");
  assertEquals(body.template, { name: "hello_world", language: { code: "en_US" } });
});

Deno.test("message-send-template: forwards a components array verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const components = [{ type: "body", parameters: [{ type: "text", text: "Ada" }] }];
  await action.execute(
    { to: "1", templateName: "welcome", languageCode: "en_US", components },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.template.components, components);
});

Deno.test("message-send-template: parses a components field supplied as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const components = [{ type: "body", parameters: [] }];
  await action.execute({
    to: "1",
    templateName: "welcome",
    languageCode: "en_US",
    components: JSON.stringify(components),
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).template.components, components);
});

Deno.test("message-send-template: rejects a non-array components value", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute(
        { to: "1", templateName: "welcome", languageCode: "en_US", components: { bad: true } },
        ctx,
      );
    },
    Error,
    "must be a JSON array",
  );
});

Deno.test("message-send-template: languageCode field defaults to en_US", () => {
  const field = action.params?.find((p) => p.key === "languageCode");
  assertEquals(field?.default, "en_US");
  assertEquals(field?.required, true);
});
