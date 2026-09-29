import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-my-own-details.ts";

Deno.test("get-my-own-details: GETs /people/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", displayName: "Jo" } }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/people/me");
  assertEquals(result, { id: "p1", displayName: "Jo" });
});

Deno.test("get-my-own-details: passes callingData through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ callingData: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("callingData"), "true");
});
