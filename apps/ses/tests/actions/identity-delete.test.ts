import { assertEquals, assertRejects } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/identity-delete.ts";

Deno.test("identity-delete: DELETE /v2/email/identities/example.com and maps the response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ emailIdentity: "example.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/identities/example.com",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "deleted": true,
    "emailIdentity": "example.com",
  });
});

Deno.test("identity-delete: uses the connection's region for the host", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: {} }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ emailIdentity: "example.com" }, ctx);
  assertEquals(new URL(calls[0].url).host, "email.eu-west-1.amazonaws.com");
});

Deno.test("identity-delete: surfaces the vendor's error type and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "Identity is not verified" },
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amzn-errortype": "BadRequestException:http://internal.amazon.com/coral/com.amazonaws.ses/",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ emailIdentity: "example.com" }, ctx)),
    Error,
    "400 BadRequestException: Identity is not verified",
  );
});
