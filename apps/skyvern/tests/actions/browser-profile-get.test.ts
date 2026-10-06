import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import browserProfileGet from "../../actions/browser-profile-get.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-profile-get: GETs /v1/browser_profiles/{id}", async () => {
  const p = { browser_profile_id: "bp_1", name: "Work" };
  const { ctx, calls } = mockCtx([{ body: p }]);
  assertEquals(await browserProfileGet.execute({ profileId: "bp_1" }, ctx), p);
  assertEquals(calls[0].url, `${HOST}/v1/browser_profiles/bp_1`);
});
