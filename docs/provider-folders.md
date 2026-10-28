# Provider folders and shared files

`w6w-pack.json` is the authoritative list of app directories. Tools must read it rather
than treat every immediate child of `apps/` as an app. Single integrations remain at
`apps/<app>`; providers with several integrations use `apps/<provider>/<app>`.

The grouped providers are Google, Microsoft, Zoho, Meta, Atlassian, AWS, Freshworks,
Twilio, Zendesk, Dropbox, Mailchimp, and LinkedIn. Existing app directory names, IDs,
versions, auth keys, and action keys are preserved. Direct source references must use
the new nested paths; references by app ID continue to work.

```text
apps/google/
  _shared/oauth2.ts
  gmail/
    package.json
    deno.json
    index.ts
    auth/oauth2.ts
  google-sheets/
    package.json
    deno.json
    index.ts
```

Each app declares any shared directories in its own `package.json`:

```json
{ "w6w": { "build": { "include": ["../_shared"] } } }
```

App code uses ordinary relative imports, such as `../../_shared/oauth2.ts` from
`gmail/auth/oauth2.ts`. Manifest image paths may also reference included directories.
Imports use the consuming app's import map; keep shared code free of app-specific imports.
Directories must be inside the app's parent, cannot be symlinks, and cannot overlap.
They are not separate apps and must not appear as pack entries.

The builder includes shared code in each consumer's `app.js`, inlines local images,
and hashes included files in the source digest. Every artifact remains independently
loadable; deploying one app does not require deploying its siblings or shared files.
Source loading supports the same declared includes with restricted read permissions.
Google OAuth endpoint constants are shared; app-specific scopes, PKCE options and hooks
remain in each integration.

Provider apps map `@w6w/types` to `../../../../core/packages/types/mod.ts` in `deno.json`
and the corresponding directory in `tsconfig.json`. Flat apps use three parent levels.
The audit and icon tools accept either nested paths or unique short names such as `gmail`.

From a sibling core checkout, build and verify the whole pack, retaining usable artifacts:

```sh
deno run -A --unstable-worker-options packages/app-build/scripts/parity.ts \
  --pack ../apps/w6w-pack.json --out ./dist/apps
```

Or build one app:

```sh
deno run -A packages/app-build/cli.ts ../apps/apps/google/gmail -o ./dist/apps
```

Output is `<out>/<app-id>/<version>/{manifest.json,app.js}` plus `<out>/index.json`.
The parity gate compares each bundle's actions, auth, triggers, health checks, and
interfaces against its source, parses the artifact manifest, and verifies the bundle hash.

These apps require the core builder/runtime with `w6w.build.include` support. When shipping
the changes, update the pinned core commit in `.github/workflows/reload-apps.yml` to the
commit containing that support before publishing this pack. The previous pinned builder
rejects shared imports; it cannot build the Google consumers.
