import { assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import getPerson from "../../actions/get-person.ts";

Deno.test("get-person: GETs /people/{id} and passes fields through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 14412 } }]);
  await getPerson.execute({ id: 14412, fields: "allFields" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people/14412");
  assertEquals(url.searchParams.get("fields"), "allFields");
});

Deno.test("get-person: is a read requiring only an id", () => {
  assertEquals(getPerson.type, "read");
  assertEquals(param(getPerson, "id").required, true);
  assertEquals((getPerson.params ?? []).filter((p) => p.required).map((p) => p.key), ["id"]);
});
