import type { ActionDefinition } from "@w6w/types";
import { peopleGet } from "../lib/people.ts";
import { employeeRef, resultOutput } from "../lib/params.ts";

interface Input {
  userId: string;
}

const leaveTypesGet: ActionDefinition<Input> = {
  key: "leave-types-get",
  type: "read",
  resource: "leave",
  title: "Get Leave Types & Balances",
  description:
    "Get an employee's leave types with permitted, availed and balance counts and each type's Id (needed by Apply Leave).",
  params: [employeeRef],
  output: resultOutput,

  async execute(input, ctx) {
    if (!input.userId) throw new Error("`userId` is required.");
    return await peopleGet(ctx, "/leave/getLeaveTypeDetails", { userId: input.userId });
  },
};

export default leaveTypesGet;
