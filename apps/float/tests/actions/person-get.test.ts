import { assertEquals } from "@std/assert";
import personGet from "../../actions/person-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("person-get - GETs /people/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { people_id: 1, name: "Sarah-Jane Smith" },
  }]);
  const out = await personGet.execute({ people_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/people/1");
  assertEquals(out, { people_id: 1, name: "Sarah-Jane Smith" });
});

Deno.test("person-get - expand param is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await personGet.execute({ people_id: 1, expand: "contracts" }, ctx);
  assertEquals(queryOf(calls[0].url).expand, "contracts");
});
