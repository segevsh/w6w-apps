import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/suppression-get.ts";

Deno.test("suppression-get: GET /v2/email/suppression/addresses/a%2Btag%40x.com and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "SuppressedDestination": {
        "EmailAddress": "a+tag@x.com",
        "Reason": "COMPLAINT",
        "LastUpdateTime": "t",
        "Attributes": {
          "MessageId": "m1",
        },
      },
    },
  }]);
  const result = await action.execute!({ emailAddress: "a+tag@x.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/suppression/addresses/a%2Btag%40x.com",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "emailAddress": "a+tag@x.com",
    "reason": "COMPLAINT",
    "lastUpdateTime": "t",
    "attributes": {
      "messageId": "m1",
    },
  });
});

Deno.test("suppression-get: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "SuppressedDestination": {
          "EmailAddress": "a+tag@x.com",
          "Reason": "COMPLAINT",
          "LastUpdateTime": "t",
          "Attributes": {
            "MessageId": "m1",
          },
        },
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ emailAddress: "a+tag@x.com" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("suppression-get: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ emailAddress: "a+tag@x.com" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
