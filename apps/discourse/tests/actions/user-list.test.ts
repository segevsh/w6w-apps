import { assert, assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: the flag is a PATH segment and defaults to active", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/admin/users/list/active.json`);

  const suspended = mockDiscourseCtx([{ body: [] }]);
  await action.execute({ flag: "suspended" }, suspended.ctx);
  assertEquals(suspended.calls[0].url, `${SITE_URL}/admin/users/list/suspended.json`);
});

Deno.test("user-list: offers exactly the six flags the route accepts", () => {
  const flag = action.params!.find((p) => p.key === "flag")!;
  assertEquals(
    (flag.options as { value: string }[]).map((o) => o.value),
    ["active", "new", "staff", "suspended", "blocked", "suspect"],
  );
  assertEquals(flag.default, "active");
});

Deno.test("user-list: `asc` is sent by presence as the string 'true'", async () => {
  // Documented enum is ["true"] — only its presence means anything.
  const on = mockDiscourseCtx([{ body: [] }]);
  await action.execute({ ascending: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("asc"), "true");

  const off = mockDiscourseCtx([{ body: [] }]);
  await action.execute({ ascending: false }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.has("asc"), false);
});

Deno.test("user-list: passes the documented query filters through", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: [] }]);
  await action.execute(
    { order: "created", page: 2, email: "a@b.test", ip: "10.0.0.1", stats: true },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("order"), "created");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("email"), "a@b.test");
  assertEquals(q.get("ip"), "10.0.0.1");
  assertEquals(q.get("stats"), "true");
});

Deno.test("user-list: warns that show_emails writes to the staff action log", () => {
  const showEmails = action.params!.find((p) => p.key === "showEmails")!;
  assert(/staff action log/i.test(showEmails.hint!));
  assertEquals(showEmails.advanced, true);
});
