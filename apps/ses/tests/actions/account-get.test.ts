import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: GET /v2/email/account and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "SendingEnabled": true,
      "SendQuota": {
        "Max24HourSend": 200,
        "MaxSendRate": 1,
        "SentLast24Hours": 5,
      },
      "ProductionAccessEnabled": false,
    },
  }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/account");
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "sendingEnabled": true,
    "sendQuota": {
      "max24HourSend": 200,
      "maxSendRate": 1,
      "sentLast24Hours": 5,
    },
    "productionAccessEnabled": false,
  });
});

Deno.test("account-get: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "SendingEnabled": true,
        "SendQuota": {
          "Max24HourSend": 200,
          "MaxSendRate": 1,
          "SentLast24Hours": 5,
        },
        "ProductionAccessEnabled": false,
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("account-get: surfaces the vendor's error type and message", async () => {
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
