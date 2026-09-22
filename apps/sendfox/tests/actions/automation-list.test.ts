import { assertEquals } from "@std/assert";
import automationList from "../../actions/automation-list.ts";
import { mockCtx, page } from "../_helpers.ts";

Deno.test("automation-list: GETs /automations with no parameters", async () => {
  const { ctx, calls } = mockCtx([
    { body: page([{ id: 1, title: "Welcome", automation_triggers: [], automation_items: [] }]) },
  ]);
  const out = await automationList.execute({}, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendfox.com/automations");
  assertEquals(out.data.length, 1);
});
