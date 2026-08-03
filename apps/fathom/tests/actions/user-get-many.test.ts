import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, page } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

Deno.test("user-get-many: GETs /users mapping settingsAccess to settings_access", async () => {
  const { ctx, calls } = mockCtx([
    { body: page([{ name: "Bob Lee", status: "active" }], null, 10) },
  ]);
  const result = await action.execute({
    cursor: "cur1",
    team: "Sales",
    status: "active",
    settingsAccess: "account_admin",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/users");
  assertEquals(url.searchParams.get("cursor"), "cur1");
  assertEquals(url.searchParams.get("team"), "Sales");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("settings_access"), "account_admin");
  assertEquals(result.items, [{ name: "Bob Lee", status: "active" }]);
});

Deno.test("user-get-many: a non-admin key's 403 surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  const err = await assertRejects(async () => await action.execute({}, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("403"));
});

Deno.test("user-get-many: offers only the documented status and access values", () => {
  const values = (key: string) =>
    (action.params?.find((p) => p.key === key)?.options as Array<{ value: string }>).map((o) =>
      o.value
    );
  assertEquals(values("status"), ["active", "deactivated", "invited"]);
  assertEquals(values("settingsAccess"), ["none", "team_admin", "account_admin"]);
});
