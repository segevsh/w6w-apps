import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import runAgent from "../../actions/run-agent.ts";

const HOST = "https://api.skyvern.com";

Deno.test("run-agent: POSTs /v1/run/agents with agent_id and parsed parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { run_id: "wr_1", status: "queued" } }]);
  const out = await runAgent.execute({
    agentId: "wpid_1",
    parameters: '{"email":"a@b.co"}',
    webhookUrl: "https://example.com/hook",
    maxElapsedTimeMinutes: 30,
    runMetadata: { env: "prod" },
  }, ctx);
  assertEquals((out as { run_id: string }).run_id, "wr_1");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${HOST}/v1/run/agents`);
  assertEquals(jsonBody(calls[0]), {
    agent_id: "wpid_1",
    parameters: { email: "a@b.co" },
    webhook_url: "https://example.com/hook",
    max_elapsed_time_minutes: 30,
    run_metadata: { env: "prod" },
  });
});
