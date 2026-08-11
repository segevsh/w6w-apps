import { assertEquals, assertRejects } from "@std/assert";
import addUserToGroup from "../../actions/add-user-to-group.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const OK = { success: true, user: { id: 7999632, first_name: "Grace" } };

/** Unlike Create Group, this endpoint takes ONE user at top level — no flattening. */
Deno.test("add-user-to-group: the user_id form sends flat top-level keys", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await addUserToGroup.execute({ groupId: 49012, userId: 7999632 }, ctx) as {
    success: boolean;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/add_user_to_group");
  assertEquals(bodyOf(calls[0]), { group_id: 49012, user_id: 7999632 });
  assertEquals(out.success, true);
});

Deno.test("add-user-to-group: the user-info form needs all three fields", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await addUserToGroup.execute({
    groupId: 49012,
    first_name: "Grace",
    last_name: "Hopper",
    email: "grace@example.com",
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    group_id: 49012,
    first_name: "Grace",
    last_name: "Hopper",
    email: "grace@example.com",
  });
});

Deno.test("add-user-to-group: an email without both names is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await addUserToGroup.execute({ groupId: 1, email: "a@b.com" }, ctx),
    Error,
    "only two forms Splitwise documents",
  );
  assertEquals(calls.length, 0);
});

/**
 * The failure body keys `errors` by the offending field rather than by `base`,
 * and the field name is the fix.
 */
Deno.test("add-user-to-group: a field-keyed error keeps its field name", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { success: false, errors: { email: ["is invalid"] } },
  }]);
  await assertRejects(
    async () => await addUserToGroup.execute({ groupId: 1, userId: 2 }, ctx),
    Error,
    "email: is invalid",
  );
});

/**
 * The email form can mint a second invited placeholder user on a retry, so the
 * honest flag for the pair is `false`.
 */
Deno.test("add-user-to-group: is declared non-idempotent", () => {
  assertEquals(addUserToGroup.idempotent, false);
});
