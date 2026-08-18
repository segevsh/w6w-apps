import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/signin-attempt-list.ts";

const attempts = ok({
  items: [
    { category: "success", type: "credentials_ok" },
    { category: "credentials_failed" },
    { category: "credentials_failed" },
    { category: "mfa_failed" },
  ],
  cursor: "c1",
  has_more: false,
});

/**
 * `mfa_failed` is the serious one — it means somebody had a working password —
 * so it is counted apart from ordinary wrong-password noise.
 */
Deno.test("signin-attempt-list: counts MFA failures separately from the rest", async () => {
  const { ctx, calls } = mockCtx([attempts], { display: eventsDisplay });
  const result = await action.execute!({}, ctx) as {
    count: number;
    failed: number;
    mfaFailed: number;
    categories: Record<string, number>;
  };
  assertEquals(calls[0].url, "https://events.1password.com/api/v1/signinattempts");
  assertEquals(result.count, 4);
  assertEquals(result.failed, 3);
  assertEquals(result.mfaFailed, 1);
  assertEquals(result.categories["credentials_failed"], 2);
});

/** Success and failure share the stream; `category` is the discriminator. */
Deno.test("signin-attempt-list: success is not counted as a failure", async () => {
  const { ctx } = mockCtx([ok({ items: [{ category: "success" }], has_more: false })], {
    display: eventsDisplay,
  });
  const result = await action.execute!({}, ctx) as { failed: number; count: number };
  assertEquals(result.count, 1);
  assertEquals(result.failed, 0);
});

Deno.test("signin-attempt-list: a continuation sends the cursor alone", async () => {
  const { ctx, calls } = mockCtx([attempts], { display: eventsDisplay });
  await action.execute!({ cursor: "c1", startTime: "2026-08-18T00:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { cursor: "c1" });
});

/** An attempt carries an email address and an IP. */
Deno.test("signin-attempt-list: logs counts only", async () => {
  const { ctx, logs } = mockCtx([attempts], { display: eventsDisplay });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 4, failed: 3, mfaFailed: 1 });
});

Deno.test("signin-attempt-list: a Connect connection is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "**Events**");
  assertEquals(calls.length, 0);
});

Deno.test("signin-attempt-list: says why mfa_failed matters most", () => {
  assert(/somebody had a working password/.test(action.description!), action.description);
});
