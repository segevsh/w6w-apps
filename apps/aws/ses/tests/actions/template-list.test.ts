import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/template-list.ts";

Deno.test("template-list: GET /v2/email/templates and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "TemplatesMetadata": [
        {
          "TemplateName": "welcome",
          "CreatedTimestamp": "2026-01-01T00:00:00Z",
        },
      ],
    },
  }]);
  const result = await action.execute!({ pageSize: 10 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/templates?PageSize=10",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "templates": [
      {
        "templateName": "welcome",
        "createdTimestamp": "2026-01-01T00:00:00Z",
      },
    ],
    "nextToken": undefined,
  });
});

Deno.test("template-list: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: {
        "TemplatesMetadata": [
          {
            "TemplateName": "welcome",
            "CreatedTimestamp": "2026-01-01T00:00:00Z",
          },
        ],
      },
    }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ pageSize: 10 }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("template-list: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ pageSize: 10 }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
