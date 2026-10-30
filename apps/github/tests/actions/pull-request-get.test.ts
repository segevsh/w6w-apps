import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-get.ts";

test("pull-request-get: GETs /pulls/{number}", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: 12 } }]);
  await action.execute({ owner: "acme", repository: "api", pullRequestNumber: 12 }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/pulls/12");
});
