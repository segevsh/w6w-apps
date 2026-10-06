import { assertEquals, assertRejects } from "@std/assert";
import sendTemplate from "../../actions/send-template.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("send-template: POST /customers/42/send_template/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await sendTemplate.execute(
    {
      "customerId": 42,
      "templateId": 5,
      "templateLanguage": "en",
      "bodyParams": "Ana, 12:00",
      "headerUrl": "https://x.co/h.png",
      "buttons": '[{"params":["a"]},null]',
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/send_template/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "template_id": 5,
    "template_language": "en",
    "template_params": {
      "header": { "url": "https://x.co/h.png" },
      "body": { "params": ["Ana", "12:00"] },
      "buttons": [{ "params": ["a"] }, null],
    },
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("send-template: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendTemplate.execute(
          {
            "customerId": 42,
            "templateId": 5,
            "templateLanguage": "en",
            "bodyParams": "Ana, 12:00",
            "headerUrl": "https://x.co/h.png",
            "buttons": '[{"params":["a"]},null]',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("send-template: declares perform", () => {
  assertEquals(sendTemplate.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
