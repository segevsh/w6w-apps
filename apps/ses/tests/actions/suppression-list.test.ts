import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/suppression-list.ts";

Deno.test("suppression-list: GET /v2/email/suppression/addresses and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "SuppressedDestinationSummaries": [
        {
          "EmailAddress": "a@x.com",
          "Reason": "BOUNCE",
          "LastUpdateTime": "2026-02-02T00:00:00Z",
        },
      ],
    },
  }]);
  const result = await action.execute!({ reason: "BOUNCE", pageSize: 5 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/suppression/addresses?Reason=BOUNCE&PageSize=5",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "destinations": [
      {
        "emailAddress": "a@x.com",
        "reason": "BOUNCE",
        "lastUpdateTime": "2026-02-02T00:00:00Z",
      },
    ],
    "nextToken": undefined,
  });
});

Deno.test("suppression-list: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "SuppressedDestinationSummaries": [
          {
            "EmailAddress": "a@x.com",
            "Reason": "BOUNCE",
            "LastUpdateTime": "2026-02-02T00:00:00Z",
          },
        ],
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ reason: "BOUNCE", pageSize: 5 }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("suppression-list: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ reason: "BOUNCE", pageSize: 5 }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
