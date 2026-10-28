import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/identity-create.ts";

Deno.test("identity-create: POST /v2/email/identities and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "IdentityType": "DOMAIN",
      "VerifiedForSendingStatus": false,
      "DkimAttributes": {
        "Tokens": [
          "x",
        ],
      },
    },
  }]);
  const result = await action.execute!({
    emailIdentity: "example.com",
    configurationSetName: "cs",
    tags: { team: "growth" },
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/identities");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "EmailIdentity": "example.com",
    "ConfigurationSetName": "cs",
    "Tags": [
      {
        "Key": "team",
        "Value": "growth",
      },
    ],
  });
  assertEquals(result, {
    "identityType": "DOMAIN",
    "verifiedForSendingStatus": false,
    "dkimAttributes": {
      "tokens": [
        "x",
      ],
    },
  });
});

Deno.test("identity-create: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "IdentityType": "DOMAIN",
        "VerifiedForSendingStatus": false,
        "DkimAttributes": {
          "Tokens": [
            "x",
          ],
        },
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({
    emailIdentity: "example.com",
    configurationSetName: "cs",
    tags: { team: "growth" },
  }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("identity-create: surfaces the vendor's error type and message", async () => {
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
          emailIdentity: "example.com",
          configurationSetName: "cs",
          tags: { team: "growth" },
        }, ctx),
      ),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
