import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-close.ts";

Deno.test("issue-close: PUTs state_event=close", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 3, state: "closed" } }]);
  await action.execute({ projectId: "1", issueIid: 3 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/1/issues/3");
  assertEquals(JSON.parse(calls[0].body!), { state_event: "close" });
});

Deno.test("issue-close: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
