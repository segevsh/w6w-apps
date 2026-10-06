import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-locales.ts";

Deno.test("list-locales: metadata", () => {
  assertEquals(action.key, "list-locales");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["includeCount", "branch"]);
});

Deno.test("list-locales: calls GET /locales on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "locales": [{ "code": "en-us" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/locales");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "locales": [{ "code": "en-us" }] });
});

Deno.test("list-locales: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "locales": [{ "code": "en-us" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/locales");
});

Deno.test("list-locales: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "locales": [{ "code": "en-us" }] } }, {
    body: { "locales": [{ "code": "en-us" }] },
  }]);
  await action.execute({}, ctx);
  await action.execute({ "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("list-locales: surfaces Contentstack's own error body", async () => {
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
      await action.execute({}, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
