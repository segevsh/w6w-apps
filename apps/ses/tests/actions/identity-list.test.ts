import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/identity-list.ts";

Deno.test("identity-list: GET /v2/email/identities and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "EmailIdentities": [
        {
          "IdentityType": "DOMAIN",
          "IdentityName": "example.com",
          "SendingEnabled": true,
          "VerificationStatus": "SUCCESS",
        },
      ],
      "NextToken": "n2",
    },
  }]);
  const result = await action.execute!({ pageSize: 2, nextToken: "t/1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/identities?PageSize=2&NextToken=t%2F1",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "identities": [
      {
        "identityType": "DOMAIN",
        "identityName": "example.com",
        "sendingEnabled": true,
        "verificationStatus": "SUCCESS",
      },
    ],
    "nextToken": "n2",
  });
});

Deno.test("identity-list: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "EmailIdentities": [
          {
            "IdentityType": "DOMAIN",
            "IdentityName": "example.com",
            "SendingEnabled": true,
            "VerificationStatus": "SUCCESS",
          },
        ],
        "NextToken": "n2",
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ pageSize: 2, nextToken: "t/1" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("identity-list: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ pageSize: 2, nextToken: "t/1" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
