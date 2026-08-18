import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/maintenance-window-list.ts";

/** An open window is the usual reason alerts have gone quiet. */
Deno.test("maintenance-window-list: reads the windows", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1, name: "Deploy" }] }]);
  assertEquals(await action.execute!({}, ctx), [{ id: 1, name: "Deploy" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/maintenance-windows");
  assert(action.description!.includes("alerts have gone quiet"), action.description);
});
