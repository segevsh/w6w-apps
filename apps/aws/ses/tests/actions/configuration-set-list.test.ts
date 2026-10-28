import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/configuration-set-list.ts";

Deno.test("configuration-set-list: GET /v2/email/configuration-sets and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "ConfigurationSets": [
        "one",
        "two",
      ],
      "NextToken": "n",
    },
  }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/configuration-sets");
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "configurationSets": [
      "one",
      "two",
    ],
    "nextToken": "n",
  });
});

Deno.test("configuration-set-list: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "ConfigurationSets": [
          "one",
          "two",
        ],
        "NextToken": "n",
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("configuration-set-list: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({}, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
