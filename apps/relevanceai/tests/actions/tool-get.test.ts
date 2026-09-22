import { assertEquals } from "@std/assert";
import toolGet from "../../actions/tool-get.ts";
import { mockRelevanceCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tool-get: GETs /studios/{id}/get and passes the definition through", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    { body: { studio: { studio_id: "s1", title: "Search", params: { q: "string" } } } },
  ]);
  const out = await toolGet.execute({ toolId: "s1" }, ctx) as { studio: Record<string, unknown> };

  assertEquals(pathOf(calls[0].url), "/latest/studios/s1/get");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), {});
  // The definition is also the answer to "what goes in `params`?".
  assertEquals(out.studio.params, { q: "string" });
});

Deno.test("tool-get: the version selector is the documented one", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { studio: {} } }]);
  await toolGet.execute({ toolId: "s1", toolVersion: "active" }, ctx);
  assertEquals(queryOf(calls[0].url), { tool_version: "active" });
});

Deno.test("tool-get: exposes no undocumented `version` param", () => {
  assertEquals(toolGet.type, "read");
  assertEquals(toolGet.resource, "tool");
  assertEquals(toolGet.params?.map((p) => p.key), ["toolId", "toolVersion"]);
});
