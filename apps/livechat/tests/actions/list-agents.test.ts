import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-agents.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-agents: hits the configuration surface with filters and fields", async () => {
  const rows = [{ id: "a@x.co", role: "owner" }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await action.execute({
    groupIds: "0,1",
    suspended: false,
    fields: ["job_title", "max_chats_count"],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/list_agents");
  assertEquals(JSON.parse(calls[0].body!), {
    filters: { group_ids: [0, 1], suspended: false },
    fields: ["job_title", "max_chats_count"],
  });
  assertEquals(out, { items: rows, count: 1 });
});

Deno.test("list-agents: no input sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals(await action.execute({}, ctx), { items: [], count: 0 });
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("list-agents: a non-integer group id is refused; vendor errors surface", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { type: "authorization", message: "scope" } },
  }]);
  await assertRejects(async () => await action.execute({ groupIds: "x" }, ctx), Error, "integers");
  await assertRejects(async () => await action.execute({}, ctx), Error, "authorization");
});
