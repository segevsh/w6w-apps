import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/me-get.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

Deno.test("me-get: reports the roles and groups that decide everything else", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      id: "42",
      display_name: "Workflow Bot",
      email: "bot@example.com",
      role_ids: ["3"],
      group_ids: ["1", "2"],
      credentials_api3: [{ client_id: "abc" }],
    },
  }], D);

  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://mycompany.cloud.looker.com/api/4.0/user");
  assertEquals(result.id, "42");
  assertEquals(result.displayName, "Workflow Bot");
  assertEquals(result.roleIds, ["3"]);
  assertEquals(result.groupIds, ["1", "2"]);
  assertEquals(result.hasApiCredentials, true);
  assertEquals(result.isDisabled, false);
});

/** A disabled user logs in and can do nothing. */
Deno.test("me-get: warns when the credential's user is disabled", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { id: "42", is_disabled: true } }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.isDisabled, true);
  assert(logs.some((l) => l.level === "warn" && /disabled/.test(l.message)), JSON.stringify(logs));
});

Deno.test("me-get: missing role and group arrays come back as empty, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "1" } }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.roleIds, []);
  assertEquals(result.groupIds, []);
  assertEquals(result.hasApiCredentials, false);
});

/** The whole point: two credentials can see different data. */
Deno.test("me-get: says access filters make this the answer to differing numbers", () => {
  assert(/row-level access filters/.test(action.description!), action.description);
  assertEquals(action.params, []);
});
