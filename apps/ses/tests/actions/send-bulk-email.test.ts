import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/send-bulk-email.ts";

Deno.test("send-bulk-email: POST /v2/email/outbound-bulk-emails and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "BulkEmailEntryResults": [
        {
          "Status": "SUCCESS",
          "MessageId": "m1",
        },
        {
          "Status": "MESSAGE_REJECTED",
          "Error": "bad address",
        },
      ],
    },
  }]);
  const result = await action.execute!({
    from: "me@example.com",
    templateName: "welcome",
    defaultTemplateData: { name: "there" },
    entries: [{ to: "a@x.com", templateData: { name: "Ada" } }, { to: ["b@x.com"] }],
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/outbound-bulk-emails");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "FromEmailAddress": "me@example.com",
    "DefaultContent": {
      "Template": {
        "TemplateName": "welcome",
        "TemplateData": '{"name":"there"}',
      },
    },
    "BulkEmailEntries": [
      {
        "Destination": {
          "ToAddresses": [
            "a@x.com",
          ],
        },
        "ReplacementEmailContent": {
          "ReplacementTemplate": {
            "ReplacementTemplateData": '{"name":"Ada"}',
          },
        },
      },
      {
        "Destination": {
          "ToAddresses": [
            "b@x.com",
          ],
        },
      },
    ],
  });
  assertEquals(result, {
    "results": [
      {
        "status": "SUCCESS",
        "messageId": "m1",
      },
      {
        "status": "MESSAGE_REJECTED",
        "error": "bad address",
      },
    ],
    "successCount": 1,
    "failureCount": 1,
  });
});

Deno.test("send-bulk-email: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "BulkEmailEntryResults": [
          {
            "Status": "SUCCESS",
            "MessageId": "m1",
          },
          {
            "Status": "MESSAGE_REJECTED",
            "Error": "bad address",
          },
        ],
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({
    from: "me@example.com",
    templateName: "welcome",
    defaultTemplateData: { name: "there" },
    entries: [{ to: "a@x.com", templateData: { name: "Ada" } }, { to: ["b@x.com"] }],
  }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("send-bulk-email: surfaces the vendor's error type and message", async () => {
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
          templateName: "welcome",
          defaultTemplateData: { name: "there" },
          entries: [{ to: "a@x.com", templateData: { name: "Ada" } }, { to: ["b@x.com"] }],
        }, ctx),
      ),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
