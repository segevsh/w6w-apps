import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-get-many.ts";

Deno.test("pull-request-get-many: GETs /pulls with the filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ owner: "acme", repository: "api", state: "closed", base: "main" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/repos/acme/api/pulls");
  assertEquals(q.get("state"), "closed");
  assertEquals(q.get("base"), "main");
});
