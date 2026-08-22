import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/runtime-list.ts";

/** Checkly retires runtimes, so "which are still current" is a real question. */
Deno.test("runtime-list: reads the runtimes, unpaged", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ name: "2025.04" }] }]);
  assertEquals(await action.execute!({}, ctx), [{ name: "2025.04" }]);
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/runtimes");
  assertEquals(action.params, []);
  assert(action.description!.includes("check scripts"), action.description);
});
