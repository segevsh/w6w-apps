import { assertEquals, assertRejects } from "@std/assert";
import { compact, DropcontactClient, isNotReady, parseEnvelope } from "../../lib/client.ts";
import { buildContact, primaryEmail } from "../../lib/contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: a 200 error:false success:false body is 'not ready', not an error", async () => {
  const { ctx } = mockCtx([{
    body: {
      error: false,
      success: false,
      reason: "Request not ready yet, try again in 30 seconds",
    },
  }]);
  const { body } = await new DropcontactClient(ctx).request("GET", "/v1/enrich/all/x");
  assertEquals(isNotReady(body), true);
  assertEquals(isNotReady({ error: false, success: true }), false);
  assertEquals(isNotReady({ error: true, success: false }), false);
});

Deno.test("client: a refusal throws with the vendor reason and a hint", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: true, reason: "Unknown account", success: false },
  }]);
  await assertRejects(
    () => new DropcontactClient(ctx).request("POST", "/v1/enrich/all", { body: {} }),
    Error,
    "Unknown account",
  );
});

Deno.test("client: error:true on a 200 still throws; non-JSON bodies are tolerated", async () => {
  const { ctx } = mockCtx([{ body: { error: true, reason: "bad", success: false } }]);
  await assertRejects(() => new DropcontactClient(ctx).request("GET", "/x"), Error, "bad");
  assertEquals(parseEnvelope("<html>").reason, "<html>");
  assertEquals(parseEnvelope(""), {});
});

Deno.test("client: sends JSON, query params, and no credential header", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, success: true } }]);
  await new DropcontactClient(ctx).request("POST", "/v1/enrich/all", {
    body: { data: [] },
    query: { forceResults: true, skip: undefined },
  });
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/all?forceResults=true");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-access-token"], undefined);
});

Deno.test("contact: buildContact maps camelCase to the vendor fields and drops empties", () => {
  assertEquals(
    buildContact({ firstName: " John ", lastName: "Smith", website: "", numSiren: "123" }),
    { first_name: "John", last_name: "Smith", num_siren: "123" },
  );
  assertEquals(compact({ a: "", b: null, c: 0 }), { c: 0 });
});

Deno.test("contact: primaryEmail prefers nominative over generic", () => {
  assertEquals(
    primaryEmail([
      { email: "contact@x.com", qualification: "generic@pro" },
      { email: "j@x.com", qualification: "nominative@pro" },
    ])?.email,
    "j@x.com",
  );
  assertEquals(
    primaryEmail([{ email: "a@x.com", qualification: "catch_all@pro" }])?.email,
    "a@x.com",
  );
  assertEquals(primaryEmail(undefined), undefined);
});
