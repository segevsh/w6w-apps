import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GET /v2/email/contact-lists/news/contacts/a%40x.com and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "ContactListName": "news",
      "EmailAddress": "a@x.com",
      "UnsubscribeAll": false,
      "TopicPreferences": [
        {
          "TopicName": "t",
          "SubscriptionStatus": "OPT_IN",
        },
      ],
    },
  }]);
  const result = await action.execute!({ contactListName: "news", emailAddress: "a@x.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/contact-lists/news/contacts/a%40x.com",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "contactListName": "news",
    "emailAddress": "a@x.com",
    "unsubscribeAll": false,
    "topicPreferences": [
      {
        "topicName": "t",
        "subscriptionStatus": "OPT_IN",
      },
    ],
  });
});

Deno.test("contact-get: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "ContactListName": "news",
        "EmailAddress": "a@x.com",
        "UnsubscribeAll": false,
        "TopicPreferences": [
          {
            "TopicName": "t",
            "SubscriptionStatus": "OPT_IN",
          },
        ],
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ contactListName: "news", emailAddress: "a@x.com" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("contact-get: surfaces the vendor's error type and message", async () => {
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
      Promise.resolve(action.execute!({ contactListName: "news", emailAddress: "a@x.com" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
