import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-releases.ts";

Deno.test("list-releases: metadata", () => {
  assertEquals(action.key, "list-releases");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "includeCount",
    "includeItemsCount",
    "limit",
    "skip",
    "branch",
  ]);
});

Deno.test("list-releases: calls GET /releases on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "releases": [{ "uid": "bltr" }] } }]);
  const out = await action.execute({ "includeItemsCount": true, "limit": 20 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.contentstack.io/v3/releases?include_items_count=true&limit=20",
  );
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "releases": [{ "uid": "bltr" }] });
});

Deno.test("list-releases: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "releases": [{ "uid": "bltr" }] } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "includeItemsCount": true, "limit": 20 }, ctx);
  assertEquals(
    calls[0].url,
    "https://azure-eu-api.contentstack.com/v3/releases?include_items_count=true&limit=20",
  );
});

Deno.test("list-releases: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "releases": [{ "uid": "bltr" }] } }, {
    body: { "releases": [{ "uid": "bltr" }] },
  }]);
  await action.execute({ "includeItemsCount": true, "limit": 20 }, ctx);
  await action.execute({ "includeItemsCount": true, "limit": 20, "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("list-releases: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "includeItemsCount": true, "limit": 20 }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
