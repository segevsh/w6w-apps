import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tags.ts";

Deno.test("list-tags: POSTs /tags/list.json with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ tag: "welcome", sent: 12 }] }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/tags/list.json");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, [{ tag: "welcome", sent: 12 }]);
});
