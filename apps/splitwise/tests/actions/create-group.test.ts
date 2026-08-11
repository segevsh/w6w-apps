import { assertEquals, assertRejects } from "@std/assert";
import createGroup from "../../actions/create-group.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { group: { id: 7, name: "The Brain Trust" } };

Deno.test("create-group: flattens members into users__i__prop", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await createGroup.execute({
    name: "The Brain Trust",
    group_type: "trip",
    members: [
      { first_name: "Alan", last_name: "Turing", email: "alan@example.org" },
      { user_id: 5823 },
    ],
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/create_group");
  assertEquals(bodyOf(calls[0]), {
    name: "The Brain Trust",
    group_type: "trip",
    users__0__email: "alan@example.org",
    users__0__first_name: "Alan",
    users__0__last_name: "Turing",
    users__1__user_id: 5823,
  });
  assertEquals(out.id, 7);
});

/**
 * The vendor's worked example sends `users__1__id`, its prose says the property
 * is `user_id`. The prose wins — `id` appears nowhere else in the API.
 */
Deno.test("create-group: sends user_id, not the example's `id`", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await createGroup.execute({ name: "g", members: [{ user_id: 9 }] }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.users__0__user_id, 9);
  assertEquals(body.users__0__id, undefined);
});

Deno.test("create-group: a member with neither id nor email fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await createGroup.execute({ name: "g", members: [{ first_name: "A" }] }, ctx),
    Error,
    "must supply either user_id or email",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-group: no members sends just the group fields", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await createGroup.execute({ name: "g", simplify_by_default: false }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "g", simplify_by_default: false });
});

/** Splitwise offers no idempotency key, and does not deduplicate by name. */
Deno.test("create-group: is declared non-idempotent", () => {
  assertEquals(createGroup.idempotent, false);
});
