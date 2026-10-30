import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-member.ts";
import { subscriberHash } from "../../lib/subscriber-hash.ts";

test("delete-member: POSTs actions/delete-permanent under the email's subscriber hash", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { listId: "abc", email: "u@example.com" },
    ctx,
  );
  const hash = subscriberHash("u@example.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    `/3.0/lists/abc/members/${hash}/actions/delete-permanent`,
  );
  assertEquals(result, { success: true });
});

test("delete-member: lowercases the email before hashing (same hash for URIST vs urist)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ listId: "abc", email: "URIST@Mailchimp.COM" }, ctx);
  const hash = subscriberHash("urist@mailchimp.com");
  assertEquals(
    new URL(calls[0].url).pathname,
    `/3.0/lists/abc/members/${hash}/actions/delete-permanent`,
  );
});
