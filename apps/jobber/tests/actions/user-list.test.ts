import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: filter is non-null, so a status is always sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { users: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("$filter: UsersFilterAttributes!"));
  assertEquals(sent.variables.filter, { status: "ACTIVATED" });
});

Deno.test("user-list: an explicit status and id set are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { users: { nodes: [] } } } }]);
  await action.execute({ status: "DEACTIVATED", userIds: "u1,u2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, {
    status: "DEACTIVATED",
    userIds: ["u1", "u2"],
  });
});

Deno.test("user-list: selects name and email as the nested objects they are", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { users: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  const query = JSON.parse(calls[0].body!).query as string;
  assert(query.includes("name { first last full }"));
  assert(query.includes("email { raw isValid }"));
});
