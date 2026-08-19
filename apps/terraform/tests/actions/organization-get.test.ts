import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

const organization = {
  status: 200,
  body: {
    data: {
      type: "organizations",
      id: "acme",
      attributes: {
        name: "acme",
        "cost-estimation-enabled": true,
        "collaborator-auth-policy": "two_factor_mandatory",
        permissions: {},
        "plan-expired": false,
      },
    },
  },
};

Deno.test("organization-get: reads one organization by name", async () => {
  const { ctx, calls } = mockCtx([organization]);
  const result = await action.execute({ organization: "acme" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/organizations/acme");
  assertEquals(result.name, "acme");
});

/** Cost estimation adds a run phase a waiting workflow did not expect. */
Deno.test("organization-get: surfaces cost estimation and the auth policy", async () => {
  const { ctx } = mockCtx([organization]);
  const result = await action.execute({ organization: "acme" }, ctx) as Record<string, unknown>;
  assertEquals(result.costEstimation, true);
  assertEquals(result.authPolicy, "two_factor_mandatory");
  assert(/adds a phase to every run/.test(action.description!), action.description);
});

Deno.test("organization-get: a name is required and nothing is requested without one", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`organization` is required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("organization-get: a name with characters needing escaping is encoded", async () => {
  const { ctx, calls } = mockCtx([organization]);
  await action.execute({ organization: "acme corp" }, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/organizations/acme%20corp");
});

/** 404 and "no access" are the same answer here. */
Deno.test("organization-get: an unknown organization explains the ambiguity", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { errors: [{ title: "not found" }] } }]);
  let message = "";
  try {
    await action.execute({ organization: "nope" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/may mean it does not exist OR/.test(message), message);
});
