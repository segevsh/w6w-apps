import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-space.ts";

Deno.test("update-space: PATCHes with the updateMask and nested config", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc" } }]);
  await action.execute!({
    name: "spaces/abc",
    updateMask: "config.accessType,config.moderation",
    accessType: "OPEN",
    moderation: "ON",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/v2/spaces/abc");
  assertEquals(url.searchParams.get("updateMask"), "config.accessType,config.moderation");
  assertEquals(JSON.parse(calls[0].body!), {
    config: { accessType: "OPEN", moderation: "ON" },
  });
});

Deno.test("update-space: sends an empty JSON body when no config fields are supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc" } }]);
  await action.execute!({ name: "spaces/abc", updateMask: "*" }, ctx);
  assertEquals(calls[0].body, "{}");
  assertEquals(new URL(calls[0].url).searchParams.get("updateMask"), "*");
});
