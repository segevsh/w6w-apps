import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

Deno.test("template-get: GET /v2/email/templates/welcome and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "TemplateName": "welcome",
      "TemplateContent": {
        "Subject": "Hi {{name}}",
        "Html": "<p>Hi</p>",
        "Text": "Hi",
      },
    },
  }]);
  const result = await action.execute!({ templateName: "welcome" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/templates/welcome");
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "templateName": "welcome",
    "subject": "Hi {{name}}",
    "html": "<p>Hi</p>",
    "text": "Hi",
  });
});

Deno.test("template-get: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "TemplateName": "welcome",
        "TemplateContent": {
          "Subject": "Hi {{name}}",
          "Html": "<p>Hi</p>",
          "Text": "Hi",
        },
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ templateName: "welcome" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("template-get: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ templateName: "welcome" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
