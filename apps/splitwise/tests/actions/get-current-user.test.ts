import { assertEquals, assertRejects } from "@std/assert";
import getCurrentUser from "../../actions/get-current-user.ts";
import { mockCtx, pathOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

const USER = {
  user: { id: 491923, first_name: "Ada", last_name: "Lovelace", default_currency: "USD" },
};

Deno.test("get-current-user: unwraps the `user` envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const out = await getCurrentUser.execute({}, ctx) as { id: number };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_current_user");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.id, 491923);
});

Deno.test("get-current-user: takes no params, so it is safe to invoke with {}", () => {
  assertEquals(getCurrentUser.params?.length, 0);
  assertEquals(getCurrentUser.type, "read");
});

Deno.test("get-current-user: a 401 surfaces Splitwise's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  await assertRejects(
    async () => await getCurrentUser.execute({}, ctx),
    Error,
    "Invalid API Request: you are not logged in",
  );
});
