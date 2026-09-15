import { assertEquals } from "@std/assert";
import personUpdate from "../../actions/person-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-update - PATCHes /people/{id} with only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { people_id: 7, name: "Renamed" } }]);
  const out = await personUpdate.execute({ people_id: 7, name: "Renamed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/people/7");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(out, { people_id: 7, name: "Renamed" });
});

Deno.test("person-update - active:false is sent as the integer 0", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await personUpdate.execute({ people_id: 7, active: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).active, 0);
});
