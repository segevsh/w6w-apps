import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-site-lead-sources.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-site-lead-sources: GET /zapier/siteLeadSources returns the body under data", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "x" }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/zapier/siteLeadSources");
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: [{ id: 1, name: "x" }] });
});

Deno.test("list-site-lead-sources: a rejected key surfaces Sierra's errorMessage", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Unauthorized request") }]);
  await assertRejects(
    () => Promise.resolve(action.execute({}, ctx)),
    Error,
    "Unauthorized request",
  );
});
