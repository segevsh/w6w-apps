import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-space.ts";

Deno.test("get-space: builds spaces/{space} from a bare id", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1" } }]);
  await action.execute!({ space: "A1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1");
});

Deno.test("get-space: accepts an already-qualified resource name without doubling it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "spaces/A1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1");
});

Deno.test("get-space: never sends useAdminAccess — this app holds no admin scope", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("useAdminAccess"), false);
});

Deno.test("get-space: rejects an id that would escape its path segment", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ space: "A1/messages/B" }, ctx));
});
