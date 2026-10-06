import { assertEquals, assertRejects } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { detail, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: GET /v1/users/{uuid}/", async () => {
  const body = { uuid: "u1", user: { email: "a@x.com" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await userGet.execute({ userUuid: "u1" }, ctx), body);
  assertEquals(pathOf(calls[0].url), "/v1/users/u1/");
});

Deno.test("user-get: a 404 surfaces the detail", async () => {
  const { ctx } = mockCtx([{ status: 404, body: detail("Not found.") }]);
  await assertRejects(
    async () => await userGet.execute({ userUuid: "x" }, ctx),
    Error,
    "404: Not found.",
  );
});
