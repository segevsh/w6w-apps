import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/template-update.ts";

Deno.test("template-update: PUT /v2/email/templates/welcome and maps the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({
    templateName: "welcome",
    subject: "Hello",
    html: "<p>Hello</p>",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/templates/welcome");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "TemplateContent": {
      "Subject": "Hello",
      "Html": "<p>Hello</p>",
    },
  });
  assertEquals(result, {
    "templateName": "welcome",
    "updated": true,
  });
});

Deno.test("template-update: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: {} }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ templateName: "welcome", subject: "Hello", html: "<p>Hello</p>" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("template-update: surfaces the vendor's error type and message", async () => {
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
        action.execute!({ templateName: "welcome", subject: "Hello", html: "<p>Hello</p>" }, ctx),
      ),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
