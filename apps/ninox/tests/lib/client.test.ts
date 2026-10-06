import { assertEquals, assertThrows } from "@std/assert";
import {
  asIds,
  asRecords,
  csv,
  errorMessage,
  NinoxClient,
  resolveWorkspaceId,
  seg,
} from "../../lib/client.ts";
import { connCtx, WS } from "../_helpers.ts";

Deno.test("client: buildUrl scopes to the workspace and drops unset query values", () => {
  const client = new NinoxClient(connCtx().ctx);
  assertEquals(
    client.buildUrl("/modules", { limit: 5, offset: undefined, filter: "" }),
    `https://go.ninox.com/api/v1/workspace/${WS}/modules?limit=5`,
  );
});

Deno.test("client: resolveWorkspaceId trims and refuses a missing id", () => {
  assertEquals(resolveWorkspaceId({ display: { workspaceId: ` ${WS} ` } } as never), WS);
  assertThrows(() => resolveWorkspaceId(undefined), Error, "no workspace id");
});

Deno.test("client: list defaults hasMore to false and tolerates a missing page_info", async () => {
  const { ctx } = connCtx([{ body: { data: [1, 2] } }]);
  assertEquals(await new NinoxClient(ctx).list("/modules"), {
    items: [1, 2],
    hasMore: false,
    limit: undefined,
    offset: undefined,
  });
});

Deno.test("client: errorMessage prefers the envelope, trims text, and hides HTML", () => {
  assertEquals(errorMessage(400, '{"error":{"message":"bad"}}'), "Ninox returned HTTP 400: bad");
  assertEquals(
    errorMessage(401, "Workspace orchestrator error"),
    "Ninox returned HTTP 401: Workspace orchestrator error",
  );
  assertEquals(errorMessage(502, "<html>x</html>"), "Ninox returned HTTP 502");
});

Deno.test("client: asIds, asRecords, csv and seg", () => {
  assertEquals(asIds("1, 2 3"), [1, 2, 3]);
  assertEquals(asIds([4, "5"]), [4, 5]);
  assertThrows(() => asIds("1.5"), Error, "not a record id");
  assertThrows(() => asRecords("[]"), Error, "non-empty");
  assertEquals(asRecords('[{"a":1}]'), [{ a: 1 }]);
  assertEquals(csv(" a , ,b "), "a,b");
  assertEquals(csv(""), undefined);
  assertEquals(seg("a b/c"), "a%20b%2Fc");
});
