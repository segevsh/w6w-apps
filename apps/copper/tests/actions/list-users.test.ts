import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import action from "../../actions/list-users.ts";

Deno.test("list-users: POSTs to /users/search — even the user list is a search", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: 137658, name: "John Doe", email: "johndoe@copper.com" }],
  }]);
  const out = await run<{ records: unknown[] }>(action, { pageNumber: 1, pageSize: 200 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/users/search");
  assertEquals(JSON.parse(calls[0].body!), { page_number: 1, page_size: 200 });
  assertEquals(out.records, [{ id: 137658, name: "John Doe", email: "johndoe@copper.com" }]);
});

Deno.test("list-users: sends an empty body when no paging is supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("list-users: offers paging only — Copper documents no filters or sorting for it", () => {
  assertEquals((action.params ?? []).map((p) => p.key), ["pageNumber", "pageSize"]);
  assert(!(action.params ?? []).some((p) => /sort/i.test(p.key)));
});
