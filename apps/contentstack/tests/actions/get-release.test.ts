import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-release.ts";

Deno.test("get-release: metadata", () => {
  assertEquals(action.key, "get-release");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["releaseUid", "branch"]);
});

Deno.test("get-release: calls GET /releases/bltr on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "release": { "uid": "bltr" } } }]);
  const out = await action.execute({ "releaseUid": "bltr" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/releases/bltr");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "release": { "uid": "bltr" } });
});

Deno.test("get-release: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "release": { "uid": "bltr" } } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({ "releaseUid": "bltr" }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/releases/bltr");
});

Deno.test("get-release: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "release": { "uid": "bltr" } } }, {
    body: { "release": { "uid": "bltr" } },
  }]);
  await action.execute({ "releaseUid": "bltr" }, ctx);
  await action.execute({ "releaseUid": "bltr", "branch": "dev" }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("get-release: rejects without `releaseUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`releaseUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-release: surfaces Contentstack's own error body", async () => {
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
      await action.execute({ "releaseUid": "bltr" }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
