import { assertEquals } from "@std/assert";
import {
  apiHostFromConnection,
  compact,
  formatWorkDriveError,
  jsonApiBody,
  listResult,
  parseErrors,
  WorkDriveClient,
} from "../../lib/client.ts";
import { mockCtx, mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("client: host comes from the connection, defaulting to the US host", () => {
  assertEquals(apiHostFromConnection(undefined), "www.zohoapis.com");
  assertEquals(
    new WorkDriveClient(mockWorkDriveCtx([], "www.zohoapis.in").ctx).host,
    "www.zohoapis.in",
  );
  assertEquals(new WorkDriveClient(mockCtx([]).ctx).host, "www.zohoapis.com");
});

Deno.test("client: jsonApiBody wraps attributes and drops unset ones, keeping false/0", () => {
  assertEquals(jsonApiBody("files", { a: "x", b: undefined, c: "", d: false, e: 0 }), {
    data: { type: "files", attributes: { a: "x", d: false, e: 0 } },
  });
  assertEquals(compact({ a: null, b: 1 }), { b: 1 });
});

Deno.test("client: listResult handles array, object, empty and cursor", () => {
  assertEquals(listResult({ data: [1, 2] }).items, [1, 2]);
  assertEquals(listResult({ data: { id: "x" } }).items, [{ id: "x" }]);
  assertEquals(listResult({}).items, []);
  const r = listResult({ data: [], links: { cursor: { has_next: true, next: "u" } } });
  assertEquals([r.hasNext, r.next], [true, "u"]);
  assertEquals(listResult({ data: [] }).hasNext, false);
});

Deno.test("client: errors are parsed from the body, tolerating non-JSON", () => {
  assertEquals(parseErrors('{"errors":[{"id":"F7003","title":"t"}]}'), [{
    id: "F7003",
    title: "t",
  }]);
  assertEquals(parseErrors("<html>"), []);
  assertEquals(
    formatWorkDriveError(401, "GET", "/x", '{"errors":[{"id":"A001","title":"No"}]}'),
    "Zoho WorkDrive 401 for GET /x: A001: No",
  );
  const long = formatWorkDriveError(500, "GET", "/x", "z".repeat(700));
  assertEquals(long.includes("700 bytes"), true);
});

Deno.test("client: request sends JSON:API headers, encodes brackets, and never sets authorization", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{ body: { data: [] } }]);
  await new WorkDriveClient(ctx).request("POST", "/files", {
    query: { "page[limit]": 5, skip: undefined },
    body: { data: {} },
  });
  assertEquals(calls[0].url, "https://www.zohoapis.com/workdrive/api/v1/files?page%5Blimit%5D=5");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a GET sends no content-type and a non-JSON 200 throws", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{ body: "<html>shell</html>" }]);
  let message = "";
  try {
    await new WorkDriveClient(ctx).get("/users/me");
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(message.includes("non-JSON"), true);
});
