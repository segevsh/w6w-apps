import { assertEquals } from "@std/assert";
import organisationGet from "../../actions/organisation-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const ORGANISATION = {
  name: "Acme Ltd",
  domain: "acme",
  currency: { id: "NZD", name: "New Zealand Dollar", symbol: "$" },
  address: "123 High St, Cityville",
  country: { id: "NZ", name: "New Zealand" },
};

Deno.test("organisation-get: reads GET /v2/organisation and returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: ORGANISATION }]);
  const result = await organisationGet.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/organisation");
  assertEquals(result, ORGANISATION);
});

Deno.test("organisation-get: it takes no params, so it is safe to call unattended", () => {
  assertEquals(organisationGet.params, []);
  assertEquals(organisationGet.type, "read");
});
