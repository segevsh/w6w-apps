import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /members` — verified against LaunchDarkly's OpenAPI document
 * (`getMembers`).
 *
 * Who is on the account and what each can do. `role` is the coarse one —
 * `reader`, `writer`, `admin`, `owner` — while `customRoles` is where a real
 * permission model lives, so a member with `role: "reader"` and a custom role
 * may still be able to change production flags.
 */
const action: ActionDefinition = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List members",
  description: "The account's members and their roles.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing LaunchDarkly members", { returnAll, limit });

    return await new LaunchDarklyClient(ctx).requestAll(
      "/members",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
