import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-get.ts";

Deno.test("member-get: looks a member up by login email", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 11, memberUserId: 100234, email: "alice@example.com", roleName: "Agent" },
  }]);
  const result = await action.execute!({ account: "alice@example.com" }, ctx) as {
    memberUserId: number;
  };

  assertEquals(calls[0].url, "https://api.lofty.com/v1.0/members/alice%40example.com");
  assertEquals(result.memberUserId, 100234);
});

/** An email can hold characters that must not be read as path structure. */
Deno.test("member-get: escapes the email before it becomes a path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ account: "a+b/c@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/members/a%2Bb%2Fc%40example.com");
});

Deno.test("member-get: the account field is required and is an email", () => {
  const account = action.params!.find((p) => p.key === "account")!;
  assertEquals(account.required, true);
  assert(/email/i.test(account.label!) || /email/i.test(account.hint!), "no email hint");
});
