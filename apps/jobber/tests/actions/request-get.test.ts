import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/request-get.ts";

Deno.test("request-get: fetches by id and bounds both work connections", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { request: { id: "r1" } } } }]);
  await action.execute({ requestId: "r1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.variables, { id: "r1" });
  assert(sent.query.includes("quotes(first: 10)"));
  assert(sent.query.includes("jobs(first: 10)"));
});
