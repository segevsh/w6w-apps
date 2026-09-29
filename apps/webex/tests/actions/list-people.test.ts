import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-people.ts";

Deno.test("list-people: GETs /people filtered by email", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "p1" }] } }]);
  const result = await action.execute({ email: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/people?email=jo%40acme.test");
  assertEquals(result, [{ id: "p1" }]);
});

Deno.test("list-people: joins id and roles as comma-separated values", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ id: "p1, p2", roles: "role1,role2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("id"), "p1,p2");
  assertEquals(url.searchParams.get("roles"), "role1,role2");
});
