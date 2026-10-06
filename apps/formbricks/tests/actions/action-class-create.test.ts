import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/action-class-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("action-class-create: full input maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({
    "workspaceId": "id_workspaceId",
    "name": "sample-name",
    "type": "code",
    "key": "sample-key",
    "description": "sample-description",
    "noCodeConfig": { "type": "click" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.formbricks.com/api/v1/management/action-classes",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "workspaceId": "id_workspaceId",
    "name": "sample-name",
    "type": "code",
    "key": "sample-key",
    "description": "sample-description",
    "noCodeConfig": { "type": "click" },
  });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("action-class-create: required input only maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({
    "workspaceId": "id_workspaceId",
    "name": "sample-name",
    "type": "code",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.formbricks.com/api/v1/management/action-classes",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "workspaceId": "id_workspaceId",
    "name": "sample-name",
    "type": "code",
  });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("action-class-create: sends x-api-key never itself and no authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  await action.execute!(
    { "workspaceId": "id_workspaceId", "name": "sample-name", "type": "code" },
    ctx,
  );
  assert(!("x-api-key" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("action-class-create: surfaces a Formbricks error body as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "bad_request",
      message: "Fields are missing or incorrectly formatted",
      details: {},
    },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "workspaceId": "id_workspaceId",
        "name": "sample-name",
        "type": "code",
      }, ctx),
    Error,
    "Fields are missing or incorrectly formatted",
  );
});
