import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-release.ts";

Deno.test("create-release: metadata", () => {
  assertEquals(action.key, "create-release");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "name",
    "description",
    "locked",
    "archived",
    "branch",
  ]);
});

Deno.test("create-release: calls POST /releases on the NA host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Release created successfully.", "release": { "uid": "bltr" } },
  }]);
  const out = await action.execute({ "name": "Autumn", "description": "Q4", "locked": false }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/releases");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "release": { "name": "Autumn", "description": "Q4", "locked": false },
  });
  assertEquals(out, { "notice": "Release created successfully.", "release": { "uid": "bltr" } });
});

Deno.test("create-release: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Release created successfully.", "release": { "uid": "bltr" } },
  }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "name": "Autumn", "description": "Q4", "locked": false }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/releases");
});

Deno.test("create-release: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "notice": "Release created successfully.", "release": { "uid": "bltr" } },
  }, { body: { "notice": "Release created successfully.", "release": { "uid": "bltr" } } }]);
  await action.execute({ "name": "Autumn", "description": "Q4", "locked": false }, ctx);
  await action.execute(
    { "name": "Autumn", "description": "Q4", "locked": false, "branch": "dev" },
    ctx,
  );
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("create-release: rejects without `name` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "description": "Q4", "locked": false }, ctx);
    },
    Error,
    "`name` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-release: surfaces Contentstack's own error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      error_message: "Validation failed",
      error_code: 141,
      errors: { title: ["is required"] },
    },
  }]);
  await assertRejects(
    async () => {
      await action.execute({ "name": "Autumn", "description": "Q4", "locked": false }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
