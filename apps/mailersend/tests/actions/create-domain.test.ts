import { assertEquals } from "@std/assert";
import action from "../../actions/create-domain.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-domain: POSTs the name and maps subdomain fields to snake_case", async () => {
  const resp = { data: { id: "dle1krod2jvn8gwm", name: "testname.com", is_verified: false } };
  const { ctx, calls } = mockCtx([{ status: 201, body: resp }]);
  const out = await exec(action, {
    name: "testname.com",
    returnPathSubdomain: "bounce",
    customTrackingSubdomain: "links",
    inboundRoutingSubdomain: "in",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/domains");
  assertEquals(bodyOf(calls[0]), {
    name: "testname.com",
    return_path_subdomain: "bounce",
    custom_tracking_subdomain: "links",
    inbound_routing_subdomain: "in",
  });
  assertEquals(out, resp);
});

Deno.test("create-domain: omits the optional subdomains when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await exec(action, { name: "a.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "a.com" });
});

Deno.test("create-domain: is non-idempotent", () => assertEquals(action.idempotent, false));
