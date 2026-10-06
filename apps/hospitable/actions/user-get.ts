import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";
import { ONE_OUTPUT } from "../lib/params.ts";

/** `GET /v2/user` — The account holder and billing details the token acts for. */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "account",
  title: "Get User & Billing",
  description:
    "Get the Hospitable account holder (name, email, billing address) the token acts for.",
  params: [],
  output: ONE_OUTPUT,

  execute(_input, ctx) {
    return new HospitableClient(ctx).request("GET", "/user");
  },
};

export default userGet;
