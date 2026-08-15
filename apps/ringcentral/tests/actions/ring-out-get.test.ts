import { assertEquals } from "@std/assert";
import ringOutGet from "../../actions/ring-out-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ring-out-get: builds the ring-out status path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ro1", status: { callStatus: "Success" } } }]);
  const out = await ringOutGet.execute({ ringoutId: "ro1" }, ctx) as Record<string, unknown>;

  assertEquals(
    pathOf(calls[0].url),
    "/restapi/v1.0/account/~/extension/~/ring-out/ro1",
  );
  assertEquals((out.status as { callStatus: string }).callStatus, "Success");
});
