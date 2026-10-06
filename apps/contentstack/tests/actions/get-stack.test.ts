import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-stack.ts";

Deno.test("get-stack: metadata", () => {
  assertEquals(action.key, "get-stack");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "includeCollaborators",
    "includeStackVariables",
    "organizationUid",
  ]);
});

Deno.test("get-stack: calls GET /stacks on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "stack": { "name": "Site", "api_key": "blt1" } } }]);
  const out = await action.execute({ "includeCollaborators": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/stacks?include_collaborators=true");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "stack": { "name": "Site", "api_key": "blt1" } });
});

Deno.test("get-stack: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "stack": { "name": "Site", "api_key": "blt1" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "includeCollaborators": true }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/stacks?include_collaborators=true",
  );
});

Deno.test("get-stack: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "includeCollaborators": true }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
