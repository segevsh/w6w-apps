import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-agent.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-agent: sends id and extra fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a@x.co", name: "Smith" } }]);
  const out = await action.execute({ agentId: "a@x.co", fields: "groups,job_title" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/get_agent");
  assertEquals(JSON.parse(calls[0].body!), { id: "a@x.co", fields: ["groups", "job_title"] });
  assertEquals(out, { agent: { id: "a@x.co", name: "Smith" } });
});

Deno.test("get-agent: fields are omitted when unset; agentId required", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a" } }]);
  await action.execute({ agentId: "a" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "a" });
  await assertRejects(async () => await action.execute({}, ctx), Error, "`agentId` is required");
});
