import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/agent-get-many.ts";

Deno.test("agent-get-many: GETs /agents and unwraps `agents`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { agents: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/agents");
  assertEquals(out, { agents: [{ id: 1 }] });
});

Deno.test("agent-get-many: maps the active and state filters", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { agents: [] } }]);
  await action.execute({ active: true, state: "fulltime" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("active"), "true");
  assertEquals(url.searchParams.get("state"), "fulltime");
});

Deno.test("agent-get-many: still sends active=false rather than dropping it", async () => {
  // `false` is a real filter value here — dropping it would silently return
  // active agents when the caller asked for inactive ones.
  const { ctx, calls } = mockFreshserviceCtx([{ body: { agents: [] } }]);
  await action.execute({ active: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("active"), "false");
});
