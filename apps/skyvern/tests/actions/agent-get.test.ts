import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import agentGet from "../../actions/agent-get.ts";

const HOST = "https://api.skyvern.com";

Deno.test("agent-get: GETs /v1/agents/{id} with optional version", async () => {
  const agent = { workflow_permanent_id: "wpid_1", title: "T", version: 3 };
  const { ctx, calls } = mockCtx([{ body: agent }, { body: agent }]);
  assertEquals(await agentGet.execute({ agentId: "wpid_1" }, ctx), agent);
  assertEquals(calls[0].url, `${HOST}/v1/agents/wpid_1`);
  await agentGet.execute({ agentId: "wpid_1", version: 2 }, ctx);
  assertEquals(calls[1].url, `${HOST}/v1/agents/wpid_1?version=2`);
});

// ---- browser sessions --------------------------------------------------------------------
