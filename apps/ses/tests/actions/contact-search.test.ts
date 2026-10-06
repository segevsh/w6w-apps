import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-search.ts";

Deno.test("contact-search: POST /v2/email/contact-lists/news/contacts/list and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "Contacts": [
        {
          "EmailAddress": "a@x.com",
          "UnsubscribeAll": false,
        },
      ],
      "NextToken": "z",
    },
  }]);
  const result = await action.execute!(
    { contactListName: "news", status: "OPT_IN", pageSize: 3 },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/contact-lists/news/contacts/list",
  );
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "Filter": {
      "FilteredStatus": "OPT_IN",
    },
    "PageSize": 3,
  });
  assertEquals(result, {
    "contacts": [
      {
        "emailAddress": "a@x.com",
        "unsubscribeAll": false,
      },
    ],
    "nextToken": "z",
  });
});

Deno.test("contact-search: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "Contacts": [
          {
            "EmailAddress": "a@x.com",
            "UnsubscribeAll": false,
          },
        ],
        "NextToken": "z",
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ contactListName: "news", status: "OPT_IN", pageSize: 3 }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("contact-search: surfaces the vendor's error type and message", async () => {
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
        action.execute!({ contactListName: "news", status: "OPT_IN", pageSize: 3 }, ctx),
      ),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
