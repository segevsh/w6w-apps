import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-update.ts";

const display = { organizationSlug: "acme" };

Deno.test("issue-update: sends only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "42" } }], { display });
  await action.execute!({ issueId: "42", status: "resolved" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/issues/42/");
  assertEquals(JSON.parse(calls[0].body!), { status: "resolved" });
});

Deno.test("issue-update: statusDetails is parsed from JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    issueId: "42",
    status: "resolved",
    statusDetails: '{"inNextRelease": true}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    status: "resolved",
    statusDetails: { inNextRelease: true },
  });
});

Deno.test("issue-update: an empty assignee is sent, because it means unassign", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ issueId: "42", assignedTo: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { assignedTo: "" });
});

Deno.test("issue-update: booleans survive, including false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ issueId: "42", isBookmarked: false, hasSeen: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { isBookmarked: false, hasSeen: true });
});

Deno.test("issue-update: refuses a no-op and malformed statusDetails", async () => {
  const empty = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ issueId: "42" }, empty.ctx),
    Error,
    "nothing to update",
  );
  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ issueId: "42", statusDetails: "{oops" }, bad.ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(empty.calls.length + bad.calls.length, 0);
});
