import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-delete.ts";

const display = { organizationSlug: "acme" };

Deno.test("issue-delete: DELETEs the issue and reports what it removed", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: "" }], { display });
  const result = await action.execute!({ issueId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/issues/42/");
  assertEquals(result, { id: "42", deleted: true });
});

Deno.test("issue-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`issueId` is required");
  assertEquals(calls.length, 0);
});
