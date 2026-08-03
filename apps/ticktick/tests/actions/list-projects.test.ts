import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-projects.ts";

Deno.test("list-projects: GETs /project with no parameters at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "P1" }, { id: "P2" }] }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.ticktick.com/open/v1/project");
  assertEquals(calls[0].body, null);
  assertEquals(out, { items: [{ id: "P1" }, { id: "P2" }], count: 2 });
});

Deno.test("list-projects: an empty account is `[]`, not a crash", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals(await action.execute!({}, ctx), { items: [], count: 0 });
});

Deno.test("list-projects: archived (closed) projects are passed through, not filtered", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "P1", closed: true }] }]);
  const out = await action.execute!({}, ctx) as { items: Array<{ closed?: boolean }> };
  assertEquals(out.items[0].closed, true);
});

Deno.test("list-projects: declares no params — the API accepts none", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "search");
});
