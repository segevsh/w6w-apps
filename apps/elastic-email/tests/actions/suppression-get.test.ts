import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/suppression-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("suppression-get: GET /suppressions/{email}", async () => {
  const { ctx, calls } = mockCtx([{ body: { Email: "a@x.com", FriendlyErrorMessage: "bounced" } }]);
  const out = await action.execute({ email: "a@x.com" }, ctx) as { Email: string };
  assertEquals(out.Email, "a@x.com");
  assertEquals(pathOf(calls[0].url), "/v4/suppressions/a%40x.com");
});

Deno.test("suppression-get: email required", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx().ctx), Error, "required");
});
