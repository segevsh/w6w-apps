import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get-many.ts";

Deno.test("project-get-many: GETs /projects and returns the response", async () => {
  const body = [{ id: "p1", name: "Inbox" }];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/projects");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
