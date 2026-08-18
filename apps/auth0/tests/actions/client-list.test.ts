import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

/**
 * The secret is excluded from the REQUEST, so Auth0 never sends it — a narrower
 * promise than trusting nobody to log the response.
 */
Deno.test("client-list: asks for an explicit field list without client_secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { clients: [], total: 0 } }], conn);
  await action.execute!({}, ctx);
  const fields = new URL(calls[0].url).searchParams.get("fields")!;
  assert(fields.includes("client_id"), fields);
  assert(!fields.includes("client_secret"), fields);
  assertEquals(new URL(calls[0].url).searchParams.get("include_fields"), "true");
});

Deno.test("client-list: filters by application type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { clients: [] } }], conn);
  await action.execute!({ appType: "non_interactive" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("app_type"), "non_interactive");
});
