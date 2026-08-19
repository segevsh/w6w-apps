import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

const account = {
  status: 200,
  body: {
    data: {
      type: "users",
      id: "user-1",
      attributes: { username: "deployer", email: "d@example.com", "is-service-account": true },
    },
  },
};

Deno.test("account-get: reads account details and takes no parameters", async () => {
  const { ctx, calls } = mockCtx([account]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/account/details");
  assertEquals(result.id, "user-1");
  assertEquals(result.username, "deployer");
  assertEquals(action.params, []);
});

/** A leaver's token disappearing takes the workflow with it. */
Deno.test("account-get: reports whether this is a machine account", async () => {
  const { ctx } = mockCtx([account]);
  const machine = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(machine.serviceAccount, true);

  const person = mockCtx([{
    status: 200,
    body: { data: { id: "user-2", attributes: { username: "alice" } } },
  }]);
  const human = await action.execute({}, person.ctx) as Record<string, unknown>;
  assertEquals(human.serviceAccount, false);
});

Deno.test("account-get: a sparse response does not throw", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: {} } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.username, undefined);
  assertEquals(result.serviceAccount, false);
});

/** Nothing in a later 403 or 404 mentions token kinds. */
Deno.test("account-get: says which failures it explains", () => {
  assert(/ORGANIZATION token cannot create runs/.test(action.description!), action.description);
  assert(/TEAM token answers 404/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});

Deno.test("account-get: a rejected token surfaces the 401 explanation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ title: "unauthorized" }] } }]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/401/.test(message), message);
});
