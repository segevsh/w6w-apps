import { assertEquals } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /bigin/v2/users with the documented type filter", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { users: [{ id: "1" }], info: { count: 1 } } }]);
  const body = await action.execute({ type: "CurrentUser", page: 1, per_page: 200 }, ctx) as {
    users: unknown[];
  };
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/bigin/v2/users");
  assertEquals(url.searchParams.get("type"), "CurrentUser");
  assertEquals(body.users.length, 1);
});

Deno.test("user-list: declares every documented type as a choice", () => {
  const param = (action.params ?? []).find((p) => p.key === "type");
  const values = (param?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, [
    "AllUsers",
    "ActiveUsers",
    "DeactiveUsers",
    "ConfirmedUsers",
    "NotConfirmedUsers",
    "DeletedUsers",
    "ActiveConfirmedUsers",
    "AdminUsers",
    "ActiveConfirmedAdmins",
    "CurrentUser",
  ]);
});
