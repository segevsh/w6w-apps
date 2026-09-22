import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

Deno.test("lead-get: the profile URL is the whole request body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { linkedin_id: "abc" } }]);
  await action.execute!({ profileUrl: "https://www.linkedin.com/in/john-doe/" }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/lead/GetLead");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { profileUrl: "https://www.linkedin.com/in/john-doe/" });
});

/** `emailAddress` and `enrichedEmailAddress` are separate fields, both nullable. */
Deno.test("lead-get: nullable fields survive as null", async () => {
  const lead = { linkedin_id: "abc", emailAddress: null, enrichedEmailAddress: "a@b.com" };
  const { ctx } = mockCtx([{ status: 200, body: lead }]);
  assertEquals(await action.execute!({ profileUrl: "https://x" }, ctx), lead);
});
