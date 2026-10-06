import { assertEquals, assertRejects } from "@std/assert";
import watchUpdate from "../../actions/watch-update.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

const ok = () => mockCtx([{ body: envelope({ id: "w1" }) }]);

Deno.test("watch-update: PATCHes only the set fields (pause/resume)", async () => {
  const { ctx, calls } = ok();
  await watchUpdate.execute({ watchId: "w1", paused: true, name: "Pricing" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/watches/w1");
  assertEquals(bodyOf(calls[0]), { paused: true, name: "Pricing" });
  await assertRejects(
    async () => await watchUpdate.execute({ watchId: "w1" }, ctx),
    Error,
    "at least one field",
  );
  await assertRejects(
    async () => await watchUpdate.execute({ watchId: "", paused: true }, ctx),
    Error,
    "Watch ID",
  );
});
