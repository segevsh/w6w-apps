import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-templated-email.ts";

Deno.test("send-templated-email: POST /v2/email/outbound-emails and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "MessageId": "0100-tpl",
    },
  }]);
  const result = await action.execute!({
    from: "me@example.com",
    to: "a@x.com",
    templateName: "welcome",
    templateData: { name: "Ada" },
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/outbound-emails");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "FromEmailAddress": "me@example.com",
    "Destination": {
      "ToAddresses": [
        "a@x.com",
      ],
    },
    "Content": {
      "Template": {
        "TemplateName": "welcome",
        "TemplateData": '{"name":"Ada"}',
      },
    },
  });
  assertEquals(result, {
    "messageId": "0100-tpl",
  });
});

Deno.test("send-templated-email: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "MessageId": "0100-tpl",
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({
    from: "me@example.com",
    to: "a@x.com",
    templateName: "welcome",
    templateData: { name: "Ada" },
  }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("send-templated-email: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!({
          from: "me@example.com",
          to: "a@x.com",
          templateName: "welcome",
          templateData: { name: "Ada" },
        }, ctx),
      ),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
