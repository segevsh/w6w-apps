import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-primary-channel.ts";

Deno.test("get-primary-channel: GETs the primaryChannel navigation property", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "19:abc@thread.skype", displayName: "General" } }]);
  const out = await action.execute({ teamId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/teams/t1/primaryChannel");
  assertEquals(out.displayName, "General");
});

Deno.test("get-primary-channel: passes $select through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ teamId: "t1", select: ["id"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id");
});

Deno.test("get-primary-channel: needs only the team id", () => {
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["teamId"]);
});
