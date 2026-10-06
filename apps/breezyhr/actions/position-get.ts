import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, position } from "../lib/client.ts";
import { companyIdParam, POSITION_OUTPUT, positionIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
}

/** `GET /company/{id}/position/{id}` — 404 when the position does not exist. */
const positionGet: ActionDefinition<Input> = {
  key: "position-get",
  type: "read",
  resource: "position",
  title: "Get Position",
  description:
    "Read one position in full: location, department, description, application form, salary, team.",
  params: [companyIdParam, positionIdParam],
  output: POSITION_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request("GET", position(input.companyId, input.positionId));
  },
};

export default positionGet;
