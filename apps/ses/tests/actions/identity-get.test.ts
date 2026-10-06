import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/identity-get.ts";

Deno.test("identity-get: GET /v2/email/identities/ada%40example.com and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "IdentityType": "EMAIL_ADDRESS",
      "VerifiedForSendingStatus": true,
      "DkimAttributes": {
        "Tokens": [
          "a",
          "b",
        ],
      },
    },
  }]);
  const result = await action.execute!({ emailIdentity: "ada@example.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/identities/ada%40example.com",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "identityType": "EMAIL_ADDRESS",
    "verifiedForSendingStatus": true,
    "dkimAttributes": {
      "tokens": [
        "a",
        "b",
      ],
    },
  });
});

Deno.test("identity-get: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "IdentityType": "EMAIL_ADDRESS",
        "VerifiedForSendingStatus": true,
        "DkimAttributes": {
          "Tokens": [
            "a",
            "b",
          ],
        },
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ emailIdentity: "ada@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("identity-get: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ emailIdentity: "ada@example.com" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
