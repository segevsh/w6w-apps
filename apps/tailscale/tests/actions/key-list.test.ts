import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-list.ts";

const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
const keys = [
  {
    id: "k1",
    keyType: "auth",
    description: "ci-runner",
    expires: soon,
    capabilities: { devices: { create: { reusable: true, preauthorized: true, ephemeral: true } } },
  },
  {
    id: "k2",
    keyType: "auth",
    description: "one-off",
    expires: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    capabilities: { devices: { create: { reusable: false, preauthorized: false } } },
  },
  { id: "k3", keyType: "api", description: "prod token", expires: soon },
  { id: "k4", keyType: "client", description: "workflow client", scopes: ["devices:core"] },
];

Deno.test("key-list: asks for every key in the tailnet by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { keys } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tailnet/-/keys");
  assertEquals(new URL(calls[0].url).searchParams.get("all"), "true");
  assertEquals(result.count, 4);
});

/** Three different credentials share one list. */
Deno.test("key-list: counts auth keys, API tokens and OAuth clients apart", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { keys } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.authKeys, 2);
  assertEquals(result.apiTokens, 1);
  assertEquals(result.oauthClients, 1);
});

/** A standing invitation into the tailnet. */
Deno.test("key-list: flags reusable preauthorized keys and warns", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { keys } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.reusablePreauthorized, ["ci-runner (k1)"]);
  assert(
    logs.some((l) => l.level === "warn" && /without device approval/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("key-list: an OAuth client has no expiry at all", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { keys } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.neverExpires, ["workflow client (k4)"]);
  assertEquals((result.expiringSoon as unknown[]).length, 2);
});

Deno.test("key-list: filters by kind after fetching, since Tailscale offers no such filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { keys } }]);
  const result = await action.execute({ keyType: "client" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("keyType"), null);
});

/** Without `all`, the answer silently depends on what the caller is. */
Deno.test("key-list: says the unfiltered answer depends on the calling credential", () => {
  const param = action.params!.find((p) => p.key === "all")!;
  assert(/without saying so/.test(param.hint!), param.hint);
});
