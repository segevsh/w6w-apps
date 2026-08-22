import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/user-list.ts";

/** An access review over the system holding every source's credentials. */
Deno.test("user-list: counts the administrators and the never-used grants", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "u1", role: "Account Administrator", logged_in_at: "2026-08-01T00:00:00Z" },
    { id: "u2", role: "Account Reviewer", logged_in_at: null },
    { id: "u3", role: "Account Administrator", logged_in_at: "2026-08-10T00:00:00Z" },
  ])]);
  const result = await action.execute!({}, ctx) as {
    count: number;
    admins: number;
    neverLoggedIn: number;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.fivetran.com/v1/users");
  assertEquals(result.count, 3);
  assertEquals(result.admins, 2);
  assertEquals(result.neverLoggedIn, 1);
});

/** A run log is not the place for a staff roster. */
Deno.test("user-list: logs counts, not the people", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "u1", email: "ada@acme.com", role: "Admin" }])]);
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1, admins: 1 });
});
