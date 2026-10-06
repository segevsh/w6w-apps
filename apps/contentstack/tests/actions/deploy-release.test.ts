import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-release.ts";

Deno.test("deploy-release: metadata", () => {
  assertEquals(action.key, "deploy-release");
  assertEquals(action.type, "perform");
  assertEquals(action.params?.map((p) => p.key), [
    "releaseUid",
    "action",
    "environments",
    "locales",
    "scheduledAt",
    "branch",
  ]);
});

Deno.test("deploy-release: calls POST /releases/bltr/deploy on the NA host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Your deploy request is in progress." } }]);
  const out = await action.execute({
    "releaseUid": "bltr",
    "action": "publish",
    "environments": "production,staging",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.contentstack.io/v3/releases/bltr/deploy");
  assertEquals(calls[0].headers["api_key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "release": { "action": "publish", "environments": ["production", "staging"] },
  });
  assertEquals(out, { "notice": "Your deploy request is in progress." });
});

Deno.test("deploy-release: uses the connection's regional host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Your deploy request is in progress." } }], {
    connection: { display: { region: "azure-eu" } },
  });
  await action.execute({
    "releaseUid": "bltr",
    "action": "publish",
    "environments": "production,staging",
  }, ctx);
  assertEquals(calls[0].url, "https://azure-eu-api.contentstack.com/v3/releases/bltr/deploy");
});

Deno.test("deploy-release: sends the branch header only when a branch is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "notice": "Your deploy request is in progress." } }, {
    body: { "notice": "Your deploy request is in progress." },
  }]);
  await action.execute({
    "releaseUid": "bltr",
    "action": "publish",
    "environments": "production,staging",
  }, ctx);
  await action.execute({
    "releaseUid": "bltr",
    "action": "publish",
    "environments": "production,staging",
    "branch": "dev",
  }, ctx);
  assertEquals(calls[0].headers["branch"], undefined);
  assertEquals(calls[1].headers["branch"], "dev");
});

Deno.test("deploy-release: rejects without `releaseUid` and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ "action": "publish", "environments": "production,staging" }, ctx);
    },
    Error,
    "`releaseUid` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("deploy-release: surfaces Contentstack's own error body", async () => {
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
      await action.execute({
        "releaseUid": "bltr",
        "action": "publish",
        "environments": "production,staging",
      }, ctx);
    },
    Error,
    "Validation failed (code 141)",
  );
});
