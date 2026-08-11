import { assert, assertEquals } from "@std/assert";
import action from "../../actions/plugin-integration-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("plugin-integration-list: GETs /v2/plugin-integrations", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "p-1" }]) }]);
  const out = await action.execute({ pageCursor: "c" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/plugin-integrations");
  assertEquals(queryOf(calls[0].url), { pageCursor: "c" });
  assertEquals(out.items.length, 1);
});

Deno.test("plugin-integration-list: records that the outbound secret is write-only", () => {
  assert(action.description!.includes("write-only"), action.description!);
});
