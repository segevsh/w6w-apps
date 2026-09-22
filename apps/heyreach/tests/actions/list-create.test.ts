import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/list/CreateEmptyList";

Deno.test("list-create: sends the name, and omits an unset type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 9, name: "Q3" } }]);
  await action.execute!({ name: "Q3" }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { name: "Q3" });
});

Deno.test("list-create: sends the documented list type when it is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 9 } }]);
  await action.execute!({ name: "Acme Co", type: "COMPANY_LIST" }, ctx);
  assertEquals(jsonBody(calls[0]), { name: "Acme Co", type: "COMPANY_LIST" });
});

Deno.test("list-create: the new list id is returned", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: 9, name: "Q3", count: 0 } }]);
  assertEquals(await action.execute!({ name: "Q3" }, ctx), { id: 9, name: "Q3", count: 0 });
});
