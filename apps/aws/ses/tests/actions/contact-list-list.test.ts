import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list-list.ts";

Deno.test("contact-list-list: GET /v2/email/contact-lists and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "ContactLists": [
        {
          "ContactListName": "news",
          "LastUpdatedTimestamp": "t",
        },
      ],
    },
  }]);
  const result = await action.execute!({ nextToken: "abc" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/contact-lists?NextToken=abc",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "contactLists": [
      {
        "contactListName": "news",
        "lastUpdatedTimestamp": "t",
      },
    ],
    "nextToken": undefined,
  });
});

Deno.test("contact-list-list: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "ContactLists": [
          {
            "ContactListName": "news",
            "LastUpdatedTimestamp": "t",
          },
        ],
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ nextToken: "abc" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("contact-list-list: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ nextToken: "abc" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
