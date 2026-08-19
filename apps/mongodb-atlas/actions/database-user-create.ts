import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, compact, csv, json, projectId } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST …/databaseUsers`, or `PATCH …/databaseUsers/{db}/{username}` — create
 * a database credential, or rotate one.
 *
 * ## Upsert, because creating an existing user is a 409
 *
 * The API has no upsert. Every caller writes the same list-then-branch, so
 * this does it — matching on **username and authentication database**
 * together, since those two are the identity.
 *
 * ## A password here is a real credential leaving this system
 *
 * It is write-only afterwards: no call returns it, ever. So the value passed
 * in is the only copy, and whatever the workflow does with it next is the
 * whole security story. This action logs the username and the roles and never
 * the password, and refuses to create a user without one rather than
 * generating a value it would then have to hand back.
 *
 * ## Roles are `{roleName, databaseName}`, and `readWriteAnyDatabase` is a lot
 *
 * The convenient thing to grant is `readWriteAnyDatabase` on `admin`, which is
 * every database on every cluster the user can reach. `readWrite` on one named
 * database is almost always what was meant, and the difference is invisible
 * once it works.
 *
 * ## Without `scopes`, the user reaches every cluster in the project
 *
 * Including ones created later. A credential for one application, scoped to
 * nothing, quietly becomes a credential for everything the project ever holds.
 */
const action: ActionDefinition = {
  key: "database-user-create",
  type: "perform",
  resource: "database-user",
  title: "Create or update a database user",
  description:
    "Create a database credential, or rotate an existing one's password. Passwords are " +
    "WRITE-ONLY — nothing returns them — and a user with no scopes can reach every cluster in " +
    "the project.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
      hint: "The only copy — Atlas never returns it again. Passing this to an existing user " +
        "rotates it.",
    },
    {
      key: "roles",
      label: "Roles",
      type: "json",
      required: true,
      default: "",
      hint: 'e.g. [{"roleName":"readWrite","databaseName":"app"}]. `readWriteAnyDatabase` on ' +
        "`admin` is every database on every reachable cluster.",
    },
    {
      key: "scopes",
      label: "Limit To Clusters",
      type: "string",
      default: "",
      hint: "Comma-separated cluster names. BLANK means every cluster in the project, including " +
        "ones created later.",
    },
    {
      key: "databaseName",
      label: "Authentication Database",
      type: "string",
      default: "admin",
      advanced: true,
      hint: "Part of the identity, and `admin` for password users — not the database being read.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      default: "",
      advanced: true,
      hint: "Worth setting: it is the only record of which application holds this credential.",
    },
  ],
  output: [
    { key: "user", type: "object", label: "The user, without its password" },
    { key: "username", type: "string", label: "The username" },
    { key: "created", type: "boolean", label: "Whether it was created rather than rotated" },
    { key: "scoped", type: "boolean", label: "False when it can reach every cluster" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const username = String(p.username ?? "").trim();
    const password = String(p.password ?? "");
    const databaseName = String(p.databaseName ?? "admin").trim() || "admin";
    if (!username) throw new Error("`username` is required");
    if (!password) {
      throw new Error(
        "`password` is required — Atlas never returns a password, so this app does not generate " +
          "one it would have to hand back through a workflow's data",
      );
    }

    const roles = json(p.roles, "roles");
    if (!Array.isArray(roles) || !roles.length) {
      throw new Error('`roles` must be a non-empty array of {"roleName","databaseName"} objects');
    }

    const scopeNames = csv(p.scopes);
    const scopes = scopeNames?.map((name) => ({ name, type: "CLUSTER" }));

    const client = new AtlasClient(ctx);
    const existing = await client.list<{ username?: string; databaseName?: string }>(
      `/api/atlas/v2/groups/${id}/databaseUsers`,
      { query: { itemsPerPage: 500 } },
    );
    // Username AND auth database together are the identity.
    const found = existing.results.some((user) =>
      user?.username === username && user?.databaseName === databaseName
    );

    const body = compact({
      username,
      password,
      databaseName,
      roles,
      scopes,
      description: p.description,
    });

    const path = found
      ? `/api/atlas/v2/groups/${id}/databaseUsers/${encodeURIComponent(databaseName)}/${
        encodeURIComponent(username)
      }`
      : `/api/atlas/v2/groups/${id}/databaseUsers`;

    const user = await client.request<{ username?: string; scopes?: unknown[] }>(path, {
      method: found ? "PATCH" : "POST",
      body,
    });

    // The username and whether it is scoped. Never the password, and never the
    // roles' contents, which name internal databases.
    ctx.log(
      scopes ? "info" : "warn",
      found
        ? "rotated an Atlas database user's password"
        : scopes
        ? "created an Atlas database user"
        : "created an Atlas database user with NO cluster scope — it can reach every cluster in " +
          "the project, including ones created later",
      { username, scoped: Boolean(scopes) },
    );

    return {
      user,
      username: user?.username ?? username,
      created: !found,
      scoped: Boolean(scopes),
    };
  },
};

export default action;
