import { test } from "node:test";
import { readFileSync } from "node:fs";
import { assert, assertEquals } from "../_assert.ts";
import auth, { VENDORS } from "../../auth/api-key.ts";

// deno-lint-ignore no-explicit-any
const ctx = {} as any;

test("api-key: a required vendor select and a required secret key", () => {
  assertEquals(auth.type, "bearer");
  const vendor = auth.fields?.find((f) => f.key === "provider");
  assert(vendor);
  assertEquals(vendor.type, "select");
  assertEquals(vendor.required, true);
  const key = auth.fields?.find((f) => f.key === "apiKey");
  assert(key);
  assertEquals(key.type, "secret");
  assertEquals(key.required, true);
});

test("api-key: test is offline and refuses an unknown vendor or a blank key", async () => {
  assertEquals((await auth.test({ credential: { provider: "groq", apiKey: "k" } }, ctx)).ok, true);
  assertEquals(
    (await auth.test({ credential: { provider: "vertex_ai", apiKey: "k" } }, ctx)).ok,
    false,
  );
  assertEquals((await auth.test({ credential: { provider: "groq", apiKey: " " } }, ctx)).ok, false);
});

test("api-key: the vendor list matches the server's proxy config", () => {
  const url = new URL("../../../../../server/litellm/config.yaml", import.meta.url);
  let yaml: string;
  try {
    yaml = readFileSync(url, "utf8");
  } catch {
    return; // the server checkout is not beside this one (CI of this repo alone)
  }
  const served = [...yaml.matchAll(/model_name: "([a-z_]+)\/\*"/g)].map((m) => m[1]).sort();
  assertEquals(VENDORS.map((v) => v.value).sort(), served);
});
