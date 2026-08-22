import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-list.ts";

const conn = { display: { pageId: "pg1" } };

Deno.test("subscriber-list: defaults to the active subscribers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "s1" }] }], conn);
  const out = await action.execute!({}, ctx) as { count: number };
  assertEquals(out.count, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("state"), "active");
});

Deno.test("subscriber-list: can narrow by type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ type: "sms" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "sms");
});

/** The count is the blast radius of a notified update. */
Deno.test("subscriber-list: frames the count as blast radius", () => {
  assert(/blast radius/.test(action.description!), action.description);
});
