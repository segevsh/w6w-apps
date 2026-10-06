import { assert, assertEquals } from "@std/assert";
import targetsList from "../../actions/targets-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("targets-list: returns targets and a count", async () => {
  const targets = [{ key: "inbox", type: "system", name: null }];
  const { ctx, calls } = mockCtx([{ body: { targets } }]);
  const out = await targetsList.execute({}, ctx) as { targets: unknown[]; count: number };
  assertEquals(out.targets, targets);
  assert(out.count === 1);
  assertEquals(pathOf(calls[0].url), "/api/v1/targets");
});
