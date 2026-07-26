import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-create-review.ts";

const PR = { owner: "acme", repository: "api", pullRequestNumber: 12 };

Deno.test("pull-request-create-review: POSTs the review with its event", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, state: "APPROVED" } }]);
  await action.execute({ ...PR, event: "APPROVE" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/pulls/12/reviews");
  assertEquals(JSON.parse(calls[0].body!), { event: "APPROVE" });
});

Deno.test("pull-request-create-review: PENDING is expressed by omitting `event`", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...PR, event: "PENDING", body: "wip" }, ctx);
  const body = JSON.parse(calls[0].body!);
  // GitHub rejects event: "PENDING" — a pending review is one with no event.
  assertEquals("event" in body, false);
  assertEquals(body.body, "wip");
});

Deno.test("pull-request-create-review: passes diff-anchored comments through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const comments = [{ path: "src/a.ts", line: 12, body: "typo" }];
  await action.execute({ ...PR, event: "COMMENT", body: "see notes", comments }, ctx);
  assertEquals(JSON.parse(calls[0].body!).comments, comments);
});
