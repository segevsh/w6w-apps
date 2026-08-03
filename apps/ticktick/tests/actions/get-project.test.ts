import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-project.ts";

Deno.test("get-project: GETs /project/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "P1", name: "Inbox" } }]);
  const out = await action.execute!({ projectId: "P1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1");
  assertEquals(out, { id: "P1", name: "Inbox" });
});

Deno.test("get-project: the id is encoded into its own path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "../../task" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/..%2F..%2Ftask");
});

Deno.test("get-project: requires the project id", () => {
  assert(action.params!.find((p) => p.key === "projectId")?.required);
  assertEquals(action.type, "read");
});
