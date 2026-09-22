import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/create-site.ts";

Deno.test("create-site: POSTs the documented body to /create", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { site_name: "new123" } }]);
  const result = await action.execute!({
    templateAlias: "agency-template",
    defaultDomainPrefix: "acme",
    lang: "en",
    url: "https://acme.com",
    doNotGenSsl: true,
  }, ctx) as { site_name: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/create");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    template_alias: "agency-template",
    default_domain_prefix: "acme",
    lang: "en",
    url: "https://acme.com",
    do_not_gen_ssl: true,
  });
  // `SiteIDRDT` is returned whole: the new alias is what every later call needs.
  assertEquals(result.site_name, "new123");
});

Deno.test("create-site: leaves unset optionals out rather than sending empties", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { site_name: "new123" } }]);
  await action.execute!({ templateAlias: "agency-template" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { template_alias: "agency-template" });
});

Deno.test("create-site: import_platform_type is a query parameter, not a body field", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { site_name: "new123" } }]);
  await action.execute!({ templateAlias: "t", importPlatformType: "wix" }, ctx);
  assertEquals(queryOf(calls[0].url).import_platform_type, "wix");
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["template_alias"]);
});

/**
 * The schema marks everything optional and the action is still `idempotent:
 * false`: a retry starts a second site build, which the account is billed for.
 */
Deno.test("create-site: is explicitly not idempotent", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});

Deno.test("create-site: a bad body surfaces Duda's own InvalidInput", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 400,
    body: {
      error_code: "InvalidInput",
      message: "Template alias 'nope' doesn't exist",
    },
  }]);
  const err = await Promise.resolve(action.execute!({ templateAlias: "nope" }, ctx)).catch((
    e: Error,
  ) => e);
  assert(err instanceof Error);
  assert(err.message.includes("InvalidInput"), err.message);
  assert(err.message.includes("Template alias 'nope' doesn't exist"), err.message);
});
