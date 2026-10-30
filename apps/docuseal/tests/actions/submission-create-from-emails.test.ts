import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-create-from-emails.ts";

test("submission-create-from-emails: sends templateId and the comma-separated emails", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1 }] }]);
  await action.execute!({ templateId: 7, emails: "a@example.com,b@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/emails");
  assertEquals(
    JSON.parse(calls[0].body!),
    { template_id: 7, emails: "a@example.com,b@example.com" },
  );
});

test("submission-create-from-emails: emails is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ templateId: 1, emails: "" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
