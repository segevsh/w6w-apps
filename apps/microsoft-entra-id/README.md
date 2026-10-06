# Microsoft Entra ID

Manage a Microsoft Entra ID (formerly Azure Active Directory) tenant through the **Microsoft Graph
v1.0** API: users, groups and their members and owners, directory roles, app registrations, service
principals, the organization profile, and deleted items.

- **Categories** — security, productivity
- **Auth methods** — oauth2 (authorization code + PKCE, `login.microsoftonline.com`)
- **Actions** — 28
- **Egress allowlist** — `graph.microsoft.com` (the OAuth endpoints are allowed implicitly)
- **API** — `https://graph.microsoft.com/v1.0`. `beta` is not used. The old Azure AD Graph
  (`graph.windows.net`) is retired and is not used or referenced by any call.

## Read this first: almost everything needs an administrator

Two separate gates sit in front of a directory call, and a "403 Authorization_RequestDenied" can be
either:

1. **Admin consent for the scope.** Every scope this App requests except `User.Read` is
   _admin-consent only_ in a work or school tenant. A tenant administrator has to grant consent once
   (Entra admin center → Enterprise applications → your app → Permissions → _Grant admin consent_,
   or the admin-consent URL) before any user can connect.
2. **A directory role for the signed-in user.** Delegated access is the _intersection_ of the app's
   scopes and what the signed-in user may do. Reading users and groups works for any member, but
   writes need a role: **User Administrator** (create/update/delete users, reset non-admin
   passwords), **Groups Administrator** (groups and membership), **Privileged Authentication
   Administrator** (reset an administrator's password), **Application Administrator** /
   **Directory Readers** (reading registrations), and so on. The role needed is named in each
   action's doc comment.

Because of that, connect with the account that will actually do the work, not a general-purpose
user.

## Authentication

OAuth 2.0 authorization code flow with PKCE against the v2.0 endpoints. The tenant segment is
`organizations`, not `common`: every call here is "Delegated (personal Microsoft account): Not
supported" in Microsoft's reference, so a consumer account is turned away at the sign-in page. A
single-tenant deployment can substitute its own tenant id when it registers its own app.

Register an app (Entra admin center → App registrations), add a **Web** redirect URI, create a client
secret, and store `client_id` / `client_secret` / `redirect_uri` on the w6w server with
`PUT /apps/:id/oauth-config/oauth2`. A refresh token is issued because `offline_access` is a
requested scope (Microsoft uses a scope, not an `access_type` parameter).

| Scope                           | Used by                                                                  | Admin consent |
| ------------------------------- | ------------------------------------------------------------------------ | :-----------: |
| `offline_access`                | refresh token                                                            |      no       |
| `User.Read`                     | connection test and label (`GET /me`)                                    |      no       |
| `User.ReadWrite.All`            | list/get/create/update/delete user, reset password, list memberships     |      yes      |
| `User.DeleteRestore.All`        | restoring a deleted **user** (Microsoft's least-privileged scope for it) |      yes      |
| `Group.ReadWrite.All`           | all group, member and owner actions; restoring a deleted group           |      yes      |
| `Application.Read.All`          | applications, service principals, listing deleted apps/SPs               |      yes      |
| `Directory.Read.All`            | get directory object, list user memberships                              |      yes      |
| `RoleManagement.Read.Directory` | directory roles and their members                                        |      yes      |
| `Organization.Read.All`         | organization profile (with only `User.Read` Graph returns just id/name)  |      yes      |

The scopes are a union chosen so each action's documented permission list is satisfied. Where
Microsoft names a narrower scope for one operation (for example `GroupMember.ReadBasic.All` to list
members), the broader scope above is listed in the reference as sufficient, so it is requested
instead of adding a second one.

## Actions

| Action                         | Graph endpoint                                                   |
| ------------------------------ | ---------------------------------------------------------------- |
| List Users                     | `GET /users`                                                     |
| Get User                       | `GET /users/{id \| upn}`                                         |
| Create User                    | `POST /users`                                                    |
| Update User                    | `PATCH /users/{id \| upn}`                                       |
| Delete User                    | `DELETE /users/{id \| upn}`                                      |
| Reset User Password            | `PATCH /users/{id \| upn}` with `passwordProfile`                |
| List User Memberships          | `GET /users/{id \| upn}/memberOf`                                |
| List Groups                    | `GET /groups`                                                    |
| Get Group                      | `GET /groups/{id}`                                               |
| Create Group                   | `POST /groups`                                                   |
| Update Group                   | `PATCH /groups/{id}`                                             |
| Delete Group                   | `DELETE /groups/{id}`                                            |
| List Group Members             | `GET /groups/{id}/members[/microsoft.graph.{type}]`              |
| Add Group Member               | `POST /groups/{id}/members/$ref`                                 |
| Remove Group Member            | `DELETE /groups/{id}/members/{id}/$ref`                          |
| List Group Owners              | `GET /groups/{id}/owners`                                        |
| Add Group Owner                | `POST /groups/{id}/owners/$ref`                                  |
| Remove Group Owner             | `DELETE /groups/{id}/owners/{id}/$ref`                           |
| List Directory Roles           | `GET /directoryRoles`                                            |
| List Directory Role Members    | `GET /directoryRoles/{id}/members` or `directoryRoles(roleTemplateId='…')` |
| List Applications              | `GET /applications`                                              |
| Get Application                | `GET /applications/{id}` or `applications(appId='…')`            |
| List Service Principals        | `GET /servicePrincipals`                                         |
| Get Service Principal          | `GET /servicePrincipals/{id}` or `servicePrincipals(appId='…')`  |
| Get Organization               | `GET /organization`                                              |
| Get Directory Object           | `GET /directoryObjects/{id}`                                     |
| List Deleted Items             | `GET /directory/deletedItems/microsoft.graph.{type}`             |
| Restore Deleted Item           | `POST /directory/deletedItems/{id}/restore`                      |

Every endpoint above was checked against its page in the Microsoft Graph v1.0 reference on
learn.microsoft.com; each action's file header carries the link and the permission, response and
quirk details taken from it.

### Querying: OData and "Advanced query"

List actions take `top` (1–999; 100 for service principals), `filter`, `search`, `orderby`, `select`
and the continuation controls `nextLink`, `all` and `maxPages`.

- **`nextLink` is a full URL.** Graph's continuation cursor already carries the original query.
  `$skip` is not supported by directory collections, so there is no offset.
- **Advanced query** (`advancedQuery`) sends `ConsistencyLevel: eventual` and `$count=true`. Graph
  requires it for `$search`, for `ne` / `not` / `endsWith` filters, for filtering on several
  properties, for `$orderby` combined with `$filter`, for OData casts, and for `$count`. `$search`
  and the member-type cast switch it on automatically, and the header is re-sent when an advanced
  `nextLink` is replayed. The count of the first page comes back as `count`. Advanced queries read
  from an index that can lag a write by a short time, so a user you just created may not appear yet.
- `$search` values are quoted for you (`displayName:Adele` → `"displayName:Adele"`), and work on
  `displayName` (and `description` for groups) only.

## Things that cost a day

- **Removing a member without `/$ref` deletes the object.** `DELETE /groups/{id}/members/{id}` removes
  the member _from the directory_ if the caller can manage that type — with `User.ReadWrite.All` that
  deletes the **user**. Both remove actions always append `/$ref`, and tests pin it.
- **`GET /directoryRoles` lists activated roles only.** A built-in role nobody has used is missing,
  and cannot be addressed by List Directory Role Members either. The role-template id form is
  stable across tenants; the role object id is not.
- **Application `id` is not `appId`.** The registration's object id, its client id, and the service
  principal's object id are three different GUIDs. Get Application and Get Service Principal take an
  "Id type" for this reason.
- **Create-user needs a verified domain**, and a license cannot be assigned until `usageLocation` is
  set. Use Get Organization (`verifiedDomains`) to pick a valid UPN suffix.
- **A group created with no owner by an app-only token is anonymous** and cannot be modified later.
  Create Group takes owners; this App is delegated, so the calling user becomes an owner of a
  Microsoft 365 group anyway.
- **Writes answer 204.** Update/delete/membership actions return a small confirmation object rather
  than the resource; call the matching Get action to read the result.
- **A group created seconds ago can answer 400** on Add Group Member ("The source resource object or
  one of the objects being referenced don't exist") until replication catches up; retry after a pause.

## Health checks

| Check     | What it does                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `service` | Declared **unavailable**, `informational`. Microsoft publishes no documented, unauthenticated, machine-readable status feed for Entra ID or Graph: `status.cloud.microsoft` is a client-rendered page answering `200 text/html` for any path, `azure.status.microsoft` is a ~7 MB human page, and the Graph service-health API needs `ServiceHealth.Read.All` with tenant-admin consent. |
| `api`     | Unsigned `GET /v1.0/organization`, `kind: dependency`, `credential: none`. An unsigned call answers `401 {"error":{"code":"InvalidAuthenticationToken",…}}` (measured 2026-10-06); that body proves the front door and auth layer are serving, so it is a **pass**. The verdict is taken from the body's `error.code`, not the status: a 5xx or an HTML page is `down`, JSON that is not an error envelope is `unknown`. |
| `quota`   | Declared **unavailable**, `informational`. Directory calls use Graph's identity-and-access ResourceUnit model; the only proactive signal is `x-ms-throttle-limit-percentage`, which Microsoft returns only once an app is past 80% of its limit. Throttling is otherwise reactive (HTTP 429 + `Retry-After`). |
| `auth:oauth2` | Derived from the Auth `test` hook: `GET /me` (needs only `User.Read`, and returns the caller's own profile, never a token). A failure is classified from Graph's `error.code`, not the status. |

## Not yet covered

Left out deliberately; each is a separate Graph surface with its own permission story:

- **Permanently deleting** a deleted item (`DELETE /directory/deletedItems/{id}`) and **restoring
  applications or service principals** end to end (the restore call is the same, but it needs
  `Application.ReadWrite.All`, which this App does not request, so it answers 403).
- **Creating, updating or deleting** applications and service principals, their secrets and
  certificates, owners, and OAuth permission grants.
- **Directory role assignment** (`roleManagement/directory/roleAssignments`), role definitions,
  `directoryRoleTemplates`, and Privileged Identity Management.
- **Licenses** (`assignLicense`, `subscribedSkus`), **devices**, administrative units, domains,
  contacts, and **transitive** membership (`transitiveMemberOf`, `transitiveMembers`).
- **Conditional Access, authentication methods, sign-in and audit logs**, risky users and other
  reporting APIs.
- **Dynamic membership rules and role-assignable groups** as first-class fields; they can be sent
  through Create Group's `additionalProperties` (role-assignable groups also need
  `RoleManagement.ReadWrite.Directory`, which is not requested).
- **Users changing their own password** (`POST /me/changePassword`) — needs the current password;
  Reset User Password is the administrator path.
- **Delta queries** (`/users/delta`) and change notifications (`POST /subscriptions`), which would be
  triggers rather than actions.
- **Batching** (`POST /$batch`).

## Icon provenance

`assets/icon.svg` is the Microsoft Entra mark, saved **verbatim** (1,502 bytes, md5
`8cf5aa1e3b910ff2e3f9f74cf4631c33`) from
<https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Microsoft/Entra/microsoftEntra.svg>.
It must stay byte-identical: format this app with `deno task fmt`, never bare `deno fmt`, which rewrites vendor SVGs.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
