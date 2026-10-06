import { assertEquals } from "@std/assert";
import listLeadSources from "../../actions/list-lead-sources.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-lead-sources: GET /lead_sources", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "ls1", text: "Web" }]) }]);
  const out = await listLeadSources.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v3/lead_sources");
  assertEquals(out.leadSources, [{ id: "ls1", text: "Web" }]);
});
