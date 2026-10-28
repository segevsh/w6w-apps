import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/suppression-put.ts";

Deno.test("suppression-put: PUT /v2/email/suppression/addresses and maps the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ emailAddress: "a@x.com", reason: "COMPLAINT" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/suppression/addresses",
  );
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "EmailAddress": "a@x.com",
    "Reason": "COMPLAINT",
  });
  assertEquals(result, {
    "emailAddress": "a@x.com",
    "reason": "COMPLAINT",
    "added": true,
  });
});

Deno.test("suppression-put: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: {} }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ emailAddress: "a@x.com", reason: "COMPLAINT" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("suppression-put: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ emailAddress: "a@x.com", reason: "COMPLAINT" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
