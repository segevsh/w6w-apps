import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailDatabaseUser } from "../lib/types.ts";
import { pageParams, pageQuery } from "../lib/params.ts";

interface Input {
  page?: number;
}

interface Output {
  database_users: RedtailDatabaseUser[];
}

const databaseUserList: ActionDefinition<Input, Output> = {
  key: "database-user-list",
  type: "read",
  resource: "database-user",
  title: "List Database Users",
  description: "List the Redtail users in this database — useful for populating an " +
    "'assigned to' or 'servicing advisor' field elsewhere in a workflow.",
  params: pageParams,
  output: [{ key: "database_users", type: "array", label: "Database users" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/lists/database_users", {
      query: pageQuery(input),
    });
    return { database_users: res.data.database_users ?? [] };
  },
};

export default databaseUserList;
