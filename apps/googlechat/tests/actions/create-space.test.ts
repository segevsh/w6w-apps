import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-space.ts";

Deno.test("create-space: POSTs /v1/spaces with the display name and spaceType SPACE", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1" } }]);
  await action.execute!({ displayName: "Launch" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Launch", spaceType: "SPACE" });
});

Deno.test("create-space: nests description and guidelines under spaceDetails", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ displayName: "L", description: "d", guidelines: "g" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).spaceDetails, { description: "d", guidelines: "g" });
});

Deno.test("create-space: sends every optional top-level field when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    displayName: "L",
    spaceHistoryState: "HISTORY_ON",
    externalUserAllowed: false,
    predefinedPermissionSettings: "ANNOUNCEMENT_SPACE",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.spaceHistoryState, "HISTORY_ON");
  // `false` is a meaningful value, not an omission.
  assertEquals(sent.externalUserAllowed, false);
  assertEquals(sent.predefinedPermissionSettings, "ANNOUNCEMENT_SPACE");
});

Deno.test("create-space: sends the invocation id as requestId so a retry does not duplicate", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const withInvocation = { ...ctx, invocation: { invocationId: "inv-42" } };
  await action.execute!({ displayName: "L" }, withInvocation as typeof ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("requestId"), "inv-42");
});

Deno.test("create-space: omits requestId when the host supplies no invocation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ displayName: "L" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("requestId"), false);
});
