import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

const display = { organizationSlug: "acme" };

Deno.test("issue-get: fetches one issue by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "42", title: "boom" } }], { display });
  const result = await action.execute!({ issueId: "42" }, ctx);
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/issues/42/");
  assertEquals(result, { id: "42", title: "boom" });
});

Deno.test("issue-get: a blank issue id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ issueId: "  " }, ctx),
    Error,
    "`issueId` is required",
  );
  assertEquals(calls.length, 0);
});
