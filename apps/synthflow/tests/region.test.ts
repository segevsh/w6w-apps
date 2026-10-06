import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import assistantList from "../actions/assistant-list.ts";
import { mockCtx, ok } from "./_helpers.ts";

function withRegion(region: unknown) {
  const m = mockCtx([{ body: ok({ assistants: [] }) }]);
  (m.ctx as { connection?: unknown }).connection = { display: { region } };
  return m as { ctx: HookContext; calls: ReturnType<typeof mockCtx>["calls"] };
}

for (
  const [region, host] of [
    ["global", "api.synthflow.ai"],
    ["us", "api.us.synthflow.ai"],
    ["eu", "api.eu.synthflow.ai"],
    [undefined, "api.synthflow.ai"],
    ["mars", "api.synthflow.ai"],
  ] as const
) {
  Deno.test(`client: connection region ${region} -> ${host}`, async () => {
    const { ctx, calls } = withRegion(region);
    await assistantList.execute({}, ctx);
    assertEquals(new URL(calls[0].url).host, host);
    assertEquals(new URL(calls[0].url).pathname, "/v2/assistants/");
  });
}
