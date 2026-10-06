import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/issue-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-get: GETs /issues/{id} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "i1", number: 42, state: "new" } } }]);
  const out = await action.execute!({ id: "42" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "i1", number: 42, state: "new" });
});

Deno.test("issue-get: percent-encodes the id segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "a/b c" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/a%2Fb%20c");
});

Deno.test("issue-get: a 404 is reported with its code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: ["Not a valid API URL!"], code: "not_found" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "x" }, ctx),
    Error,
    "(not_found)",
  );
});
