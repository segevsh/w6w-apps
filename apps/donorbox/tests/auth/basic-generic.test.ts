import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import type { HookContext, SignableRequest } from "@w6w/types";
import auth from "../../auth/basic.ts";

// `@w6w/types` is only resolvable under Deno (import map); `node --test` skips this case.
test(
  "basic: derives basic.v1 and a mapped username/password signs Basic base64(alice:s3cret)",
  { skip: typeof Deno === "undefined" },
  async () => {
    const { genericContractFor, mapGenericSource } = await import("@w6w/types");
    assertEquals(genericContractFor(auth), "basic.v1");
    const credential = mapGenericSource(auth, "basic.v1", {
      username: "alice",
      password: "s3cret",
    });
    assertEquals(credential, { email: "alice", apiKey: "s3cret" });
    const request = { url: "https://example.test/x", method: "GET", headers: {} };
    const signed = await auth.sign!(
      { request: request as unknown as SignableRequest, credential: credential! },
      {} as HookContext,
    ) as SignableRequest;
    assertEquals(signed.headers["authorization"], `Basic ${btoa("alice:s3cret")}`);
  },
);
