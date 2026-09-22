import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-get-tags.ts";

/**
 * HeyReach publishes no response schema for this operation, so the action's
 * contract is "return whatever the API returned" — including an array, which is
 * the shape its prose implies ("the tags are alphabetically sorted").
 */
Deno.test("lead-get-tags: POSTs the profile URL and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ["alpha", "zeta"] }]);
  const result = await action.execute!(
    { profileUrl: "https://www.linkedin.com/in/john-doe/" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/lead/GetTags");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { profileUrl: "https://www.linkedin.com/in/john-doe/" });
  assertEquals(result, ["alpha", "zeta"]);
});

Deno.test("lead-get-tags: an object body is passed through unchanged", async () => {
  const body = { tags: ["alpha"] };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute!({ profileUrl: "https://x" }, ctx), body);
});
