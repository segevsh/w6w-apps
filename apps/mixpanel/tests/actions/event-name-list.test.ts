import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-name-list.ts";

const conn = { display: { projectId: "123", region: "us" } };

Deno.test("event-name-list: reads the project's event names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ["Signed Up", "Purchased"] }], conn);
  const out = await action.execute!({}, ctx) as { names: string[] };
  assertEquals(out.names, ["Signed Up", "Purchased"]);
  assertEquals(new URL(calls[0].url).pathname, "/api/query/events/names");
});
