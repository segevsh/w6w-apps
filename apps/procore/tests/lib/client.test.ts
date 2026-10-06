import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  apiBaseOf,
  defaultCompanyOf,
  parseLink,
  ProcoreClient,
  PRODUCTION_API,
  SANDBOX_API,
} from "../../lib/client.ts";
import type { RedactedConnection } from "@w6w/types";

const conn = (display: Record<string, unknown>) => ({ display }) as unknown as RedactedConnection;

Deno.test("parseLink: extracts next and last page numbers", () => {
  const link = "<https://api.procore.com/rest/v1.0/projects?company_id=1&page=2&per_page=100>; " +
    'rel="next", <https://api.procore.com/rest/v1.0/projects?page=5&per_page=100>; rel="last"';
  assertEquals(parseLink(link), { next: 2, last: 5 });
  assertEquals(parseLink(null), {});
  assertEquals(parseLink("garbage"), {});
});

Deno.test("apiBaseOf: only the two known hosts are honoured", () => {
  assertEquals(apiBaseOf(undefined), PRODUCTION_API);
  assertEquals(apiBaseOf(conn({ apiBase: SANDBOX_API })), SANDBOX_API);
  assertEquals(apiBaseOf(conn({ apiBase: "https://evil.example.com" })), PRODUCTION_API);
});

Deno.test("defaultCompanyOf: reads a positive integer only", () => {
  assertEquals(defaultCompanyOf(conn({ companyId: 42 })), 42);
  assertEquals(defaultCompanyOf(conn({ companyId: "42" })), 42);
  assertEquals(defaultCompanyOf(conn({ companyId: "abc" })), undefined);
  assertEquals(defaultCompanyOf(undefined), undefined);
});

Deno.test("request: header comes from the override, else the connection default", async () => {
  const a = mockCtx([{ body: {} }], { companyId: 7 });
  await new ProcoreClient(a.ctx).request("/rest/v1.0/x", {});
  assertEquals(a.calls[0].headers["procore-company-id"], "7");

  const b = mockCtx([{ body: {} }], { companyId: 7 });
  await new ProcoreClient(b.ctx).request("/rest/v1.0/x", { companyId: 9 });
  assertEquals(b.calls[0].headers["procore-company-id"], "9");

  const c = mockCtx([{ body: {} }], { companyId: 7 });
  await new ProcoreClient(c.ctx).request("/rest/v1.0/me", { noCompany: true });
  assertEquals(c.calls[0].headers["procore-company-id"], undefined);
  assertEquals(c.calls[0].headers["authorization"], undefined);
});

Deno.test("request: sandbox connection goes to the sandbox host", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { apiBase: SANDBOX_API });
  await new ProcoreClient(ctx).request("/rest/v1.0/x");
  assert(calls[0].url.startsWith("https://sandbox.procore.com/rest/v1.0/x"));
});

Deno.test("request: non-2xx throws with status and body", async () => {
  const { ctx } = mockCtx([{ status: 403, statusText: "Forbidden", body: { errors: "nope" } }]);
  await assertRejects(
    () => new ProcoreClient(ctx).request("/rest/v1.0/x"),
    Error,
    "Procore 403 Forbidden for GET /rest/v1.0/x",
  );
});

Deno.test("list: folds the Link header into nextPage/hasMore", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: 1 }],
    headers: {
      "content-type": "application/json",
      link: '<https://api.procore.com/rest/v1.0/x?page=3&per_page=1>; rel="next", ' +
        '<https://api.procore.com/rest/v1.0/x?page=9&per_page=1>; rel="last"',
    },
  }]);
  const page = await new ProcoreClient(ctx).list("/rest/v1.0/x", { page: 2, perPage: 1 });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "1");
  assertEquals(page, {
    items: [{ id: 1 }],
    page: 2,
    perPage: 1,
    nextPage: 3,
    lastPage: 9,
    hasMore: true,
  });
});

Deno.test("list: no Link header means the last page", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const page = await new ProcoreClient(ctx).list("/rest/v1.0/x", {});
  assertEquals(page.hasMore, false);
  assertEquals(page.nextPage, undefined);
  assertEquals(page.page, 1);
});
