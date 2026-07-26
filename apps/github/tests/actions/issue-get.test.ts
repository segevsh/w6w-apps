import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

Deno.test("issue-get: GETs the issue by number", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: 4 } }]);
  assertEquals(await action.execute({ owner: "acme", repository: "api", issueNumber: 4 }, ctx), {
    number: 4,
  });
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/issues/4");
});
