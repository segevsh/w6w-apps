import { assertEquals, assertRejects } from "@std/assert";
import createFriend from "../../actions/create-friend.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { friend: { id: 15, first_name: "Ada", registration_status: "invited" } };

/**
 * The schema lists `user_email` / `user_first_name` / `user_last_name` and then
 * declares `required: ["email"]`, naming a property that does not exist in its
 * own schema. This app follows the `properties` block and the prose, both of
 * which use the `user_` prefix.
 */
Deno.test("create-friend: sends user_email, following the properties block", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  const out = await createFriend.execute({
    user_email: "ada@example.com",
    user_first_name: "Ada",
    user_last_name: "Lovelace",
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3.0/create_friend");
  assertEquals(bodyOf(calls[0]), {
    user_email: "ada@example.com",
    user_first_name: "Ada",
    user_last_name: "Lovelace",
  });
  // The `required: ["email"]` typo must NOT become a second key on the wire.
  assertEquals(bodyOf(calls[0]).email, undefined);
  assertEquals(out.id, 15);
});

Deno.test("create-friend: names are optional — ignored when the user exists", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await createFriend.execute({ user_email: "ada@example.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { user_email: "ada@example.com" });
});

Deno.test("create-friend: an empty email fails before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await createFriend.execute({ user_email: "  " }, ctx),
    Error,
    "user_email is required",
  );
  assertEquals(calls.length, 0);
});

/** An unowned email mints an invited placeholder, so a retry can mint a second. */
Deno.test("create-friend: is declared non-idempotent", () => {
  assertEquals(createFriend.idempotent, false);
});
