import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-lock.ts";

test("issue-lock: PUTs the lock route with the reason", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute(
    { owner: "acme", repository: "api", issueNumber: 4, lockReason: "resolved" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/issues/4/lock");
  assertEquals(JSON.parse(calls[0].body!), { lock_reason: "resolved" });
});
