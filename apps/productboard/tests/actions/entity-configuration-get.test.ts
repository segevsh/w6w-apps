import { assertEquals } from "@std/assert";
import action from "../../actions/entity-configuration-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-configuration-get: puts the type in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ type: "feature", fields: [] }) }]);
  const out = await action.execute({ type: "feature" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities/configurations/feature");
  assertEquals(out.data, { type: "feature", fields: [] });
});

Deno.test("entity-configuration-get: a pasted separator cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute({ type: "feature/../../notes" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/entities/configurations/feature%2F..%2F..%2Fnotes");
});

Deno.test("entity-configuration-get: the type is a required select", () => {
  const p = action.params?.find((p) => p.key === "type");
  assertEquals(p?.required, true);
  assertEquals(p?.type, "select");
});
