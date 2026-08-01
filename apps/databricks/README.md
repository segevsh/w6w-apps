# Databricks

Execute SQL statements and manage Unity Catalog catalogs and tables in a Databricks workspace.

## Setup

Every workspace has its own full host URL (e.g. `https://adb-1234567890123456.7.azuredatabricks.net`) — copy it from your browser's address bar while in the workspace. Generate a Personal Access Token from **User Settings → Developer → Access tokens**.

## Auth

**`bearer-token`** (`type: "apiKey"`) — fields `workspaceUrl` + `accessToken`, sent as `Authorization: Bearer <token>`. Verified against n8n's `DatabricksApi.credentials.ts`. `test` calls `GET /api/2.0/preview/scim/v2/Me` — needs no workspace-specific permission beyond a valid user, so it works as a liveness probe for any token.

`network.allow` covers the three cloud-specific workspace domain suffixes: `*.cloud.databricks.com` (AWS), `*.azuredatabricks.net` (Azure), `*.gcp.databricks.com` (GCP).

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `sql-statement-execute` | perform | `POST /api/2.0/sql/statements` |
| `sql-statement-get` | read | `GET /api/2.0/sql/statements/{id}` |
| `catalog-list` | search | `GET /api/2.1/unity-catalog/catalogs` |
| `catalog-get` | read | `GET /api/2.1/unity-catalog/catalogs/{name}` |
| `catalog-create` | perform | `POST /api/2.1/unity-catalog/catalogs` |
| `catalog-delete` | perform | `DELETE /api/2.1/unity-catalog/catalogs/{name}` |
| `table-list` | search | `GET /api/2.1/unity-catalog/tables` |
| `table-get` | read | `GET /api/2.1/unity-catalog/tables/{fullName}` |

**SQL execution is honestly async**: `sql-statement-execute` submits with the API's maximum synchronous wait (`wait_timeout: "50s"`, `on_wait_timeout: "CONTINUE"`) and returns whatever Databricks answers with — a finished result, or a `PENDING`/`RUNNING` status plus a `statement_id` to poll with `sql-statement-get`. It does not poll internally.

**Deliberately not built**: Jobs (run/list/get-status) and Clusters (list/start/terminate) actions. n8n's own current Databricks node doesn't implement either resource, and their exact request/response shapes couldn't be independently verified in this environment — nothing was invented for them.

## Health checks

- **`service`** — declared absent. Every workspace is a separate per-customer deployment; Databricks publishes no aggregate status feed across them.
- **`workspace`** (`kind: "dependency"`, `scope: "connection"`) — unauthenticated probe of this connection's own `workspaceUrl`. A 401 counts as reachable (proves the workspace is serving); credential validity is the derived `auth:bearer-token` check's job.
- **`auth:bearer-token`** — derived automatically from the auth method's `test` hook.
