import type { ActionDefinition } from "@w6w/types";
import { SpotifyClient, unset } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  public?: boolean;
  collaborative?: boolean;
}

/**
 * Create an empty playlist for the current user.
 * https://developer.spotify.com/documentation/web-api/reference/create-playlist
 * (checked 2026-08-01). `POST /me/playlists` — the current endpoint; the
 * older `POST /users/{user_id}/playlists` form was removed per Spotify's
 * February 2026 Web API changelog. Requires `playlist-modify-public` when
 * creating a public playlist, `playlist-modify-private` when private; both
 * are on the `oauth2` auth method so either case works.
 *
 * Not idempotent: a retry with the same name creates a second, separate
 * playlist — Spotify assigns a new ID per call and offers no request key.
 */
const playlistCreate: ActionDefinition<Input> = {
  key: "playlist-create",
  type: "perform",
  resource: "playlist",
  title: "Create Playlist",
  description: "Create a new (empty) playlist for the current user.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "public",
      label: "Public",
      type: "boolean",
      default: true,
      hint: "Collaborative playlists must be private.",
    },
    { key: "collaborative", label: "Collaborative", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "string", label: "Playlist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "public", type: "boolean", label: "Public" },
    { key: "collaborative", type: "boolean", label: "Collaborative" },
    { key: "external_urls", type: "object", label: "External URLs" },
  ],

  execute(input, ctx) {
    return new SpotifyClient(ctx).request("/me/playlists", {
      method: "POST",
      body: {
        name: input.name,
        description: unset(input.description),
        public: input.public ?? true,
        collaborative: input.collaborative ?? false,
      },
    });
  },
};

export default playlistCreate;
