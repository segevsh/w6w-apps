import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email.ts";

Deno.test("send-email: POST /v2/email/outbound-emails and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "MessageId": "0100-abc",
    },
  }]);
  const result = await action.execute!({
    from: "Me <me@example.com>",
    to: "a@x.com, b@x.com",
    cc: "c@x.com",
    subject: "Hi",
    textBody: "hello",
    htmlBody: "<b>hello</b>",
    configurationSetName: "cs",
    tags: { campaign: "w" },
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/outbound-emails");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "FromEmailAddress": "Me <me@example.com>",
    "Destination": {
      "ToAddresses": [
        "a@x.com",
        "b@x.com",
      ],
      "CcAddresses": [
        "c@x.com",
      ],
    },
    "Content": {
      "Simple": {
        "Subject": {
          "Data": "Hi",
          "Charset": "UTF-8",
        },
        "Body": {
          "Text": {
            "Data": "hello",
            "Charset": "UTF-8",
          },
          "Html": {
            "Data": "<b>hello</b>",
            "Charset": "UTF-8",
          },
        },
      },
    },
    "ConfigurationSetName": "cs",
    "EmailTags": [
      {
        "Name": "campaign",
        "Value": "w",
      },
    ],
  });
  assertEquals(result, {
    "messageId": "0100-abc",
  });
});

Deno.test("send-email: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "MessageId": "0100-abc",
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({
    from: "Me <me@example.com>",
    to: "a@x.com, b@x.com",
    cc: "c@x.com",
    subject: "Hi",
    textBody: "hello",
    htmlBody: "<b>hello</b>",
    configurationSetName: "cs",
    tags: { campaign: "w" },
  }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("send-email: surfaces the vendor's error type and message", async () => {
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
          from: "Me <me@example.com>",
          to: "a@x.com, b@x.com",
          cc: "c@x.com",
          subject: "Hi",
          textBody: "hello",
          htmlBody: "<b>hello</b>",
          configurationSetName: "cs",
          tags: { campaign: "w" },
        }, ctx),
      ),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
