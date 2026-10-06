import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/set-routing-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("set-routing-status: sends status and agent_id", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ status: "not_accepting_chats", agentId: "a@x.co" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/set_routing_status");
  assertEquals(JSON.parse(calls[0].body!), { status: "not_accepting_chats", agent_id: "a@x.co" });
  assertEquals(out, { updated: true });
});

Deno.test("set-routing-status: no agent id changes the token's own agent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ status: "accepting_chats" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "accepting_chats" });
});

Deno.test("set-routing-status: validates the status; is idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`status` is required");
  await assertRejects(
    async () => await action.execute({ status: "away" }, ctx),
    Error,
    "must be one of",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, true);
});
