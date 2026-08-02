import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-server-info.ts";

Deno.test("get-server-info: GETs /server and returns the parsed body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ID: 1, Name: "My Server" } }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/server");
  assertEquals(out, { ID: 1, Name: "My Server" });
});
