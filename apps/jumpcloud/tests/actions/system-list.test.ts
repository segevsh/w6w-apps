import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-list.ts";

const display = { display: { region: "us" } };

Deno.test("system-list: reads the V1 systems collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ _id: "s1" }] } }], display);
  assertEquals(await action.execute!({}, ctx), [{ _id: "s1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/systems");
});

Deno.test("system-list: filter, sort and search reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], display);
  await action.execute!({ filter: "os:$eq:Mac OS X", sort: "hostname", search: "laptop" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter"), "os:$eq:Mac OS X");
  assertEquals(q.get("sort"), "hostname");
  assertEquals(q.get("search"), "laptop");
});
