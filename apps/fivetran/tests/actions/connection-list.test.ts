import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/connection-list.ts";

/** Broken, warning and paused are three different things. */
Deno.test("connection-list: separates broken, warning and paused", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "c1", schema: "shop", status: { setup_state: "broken" } },
    { id: "c2", schema: "crm", status: { setup_state: "connected", warnings: [{ code: "x" }] } },
    { id: "c3", schema: "erp", paused: true, status: { setup_state: "connected" } },
    { id: "c4", schema: "web", status: { setup_state: "connected" } },
  ])]);
  const result = await action.execute!({}, ctx) as {
    count: number;
    broken: string[];
    warning: string[];
    pausedCount: number;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.fivetran.com/v1/connections");
  assertEquals(result.count, 4);
  assertEquals(result.broken, ["shop"]);
  assertEquals(result.warning, ["crm"]);
  assertEquals(result.pausedCount, 1);
});

/** A broken connection is not also counted as a warning. */
Deno.test("connection-list: a broken connection appears once, as broken", async () => {
  const { ctx } = mockCtx([page([
    { id: "c1", schema: "shop", status: { setup_state: "broken", warnings: [{ code: "x" }] } },
  ])]);
  const result = await action.execute!({}, ctx) as { broken: string[]; warning: string[] };
  assertEquals(result.broken, ["shop"]);
  assertEquals(result.warning, []);
});

Deno.test("connection-list: the group and schema filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ groupId: "g1", schema: "shop" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("group_id"), "g1");
  assertEquals(q.get("schema"), "shop");
});

Deno.test("connection-list: logs counts only", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "c1", status: { setup_state: "connected" } }])]);
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 1, broken: 0 });
});

/** Treating a paused connection as an incident trains people to ignore this. */
Deno.test("connection-list: says paused is a decision, not a fault", () => {
  assert(/somebody's decision/.test(action.description!), action.description);
});
