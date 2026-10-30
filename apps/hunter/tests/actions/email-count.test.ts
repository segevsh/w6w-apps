import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/email-count.ts";

test("email-count: GETs /email-count with domain and type", async () => {
  const body = envelope({ total: 81, personal_emails: 65, generic_emails: 16 });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ domain: "stripe.com", type: "personal" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/email-count");
  const q = queryOf(calls[0].url);
  assertEquals(q.domain, "stripe.com");
  assertEquals(q.type, "personal");
  assertEquals(result, body);
});

test("email-count: falls back to company when domain is empty", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ total: 0 }) }]);
  await action.execute!({ company: "stripe" }, ctx);
  assertEquals(queryOf(calls[0].url).company, "stripe");
});
