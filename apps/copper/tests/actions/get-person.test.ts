import { assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/get-person.ts";

Deno.test("get-person: GETs /people/{id} — fetching one record is a GET, unlike listing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7, name: "Jim Halpert" } }]);
  const out = await action.execute({ personId: 7 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/7");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: 7, name: "Jim Halpert" });
});

Deno.test("get-person: escapes the id into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ personId: "a b/c" }, ctx);
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/a%20b%2Fc");
});

Deno.test("get-person: is a read with a required id", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "person");
  assertEquals(param(action, "personId").required, true);
});
