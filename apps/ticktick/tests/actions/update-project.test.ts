import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-project.ts";

Deno.test("update-project: POSTs — there is no PUT or PATCH in this API", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/project/P1");
});

Deno.test("update-project: sends only what the caller set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", color: "#000000" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { color: "#000000" });
});

Deno.test("update-project: the project id stays a path segment, never a body field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ projectId: "P1", name: "x" }, ctx);
  assert(!("projectId" in JSON.parse(calls[0].body!)));
  assert(!("id" in JSON.parse(calls[0].body!)));
});

Deno.test("update-project: name is optional here, unlike on create", () => {
  assertEquals(action.params!.find((p) => p.key === "name")?.required, undefined);
  assertEquals(action.idempotent, true);
});
