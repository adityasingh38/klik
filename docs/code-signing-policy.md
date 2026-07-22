# Code signing policy

Klik's Windows installers are signed so you can verify that what you downloaded is what was
built from this repository, and that nobody altered it in between.

Code signing is provided free of charge by [SignPath Foundation](https://signpath.org/), using
the [SignPath.io](https://signpath.io/) signing service.

## Project

- **Project:** Klik
- **Repository:** https://github.com/adityasingh38/klik
- **Licence:** [MIT](../LICENSE)
- **Signed artifacts:** the Windows installer, `Klik-Setup-<version>.exe`, attached to each
  [GitHub release](https://github.com/adityasingh38/klik/releases)

The macOS disk image is not covered by this policy. It is currently unsigned, and the
[README](../README.md) says so on the download.

## Team roles

Klik is maintained by one person. The roles below are named separately because signing
requires them to be distinct responsibilities, not because there are three people.

| Role | Who |
|---|---|
| Author | Aditya Singh ([@adityasingh38](https://github.com/adityasingh38)) |
| Reviewer | Aditya Singh ([@adityasingh38](https://github.com/adityasingh38)) |
| Approver | Aditya Singh ([@adityasingh38](https://github.com/adityasingh38)) |

Multi-factor authentication is enabled on both the GitHub account that owns this repository
and the SignPath account that approves signing requests.

## How a signed build is produced

Every signed binary comes from a tagged commit in this repository, built by CI. No installer
is ever signed from a local machine.

1. A version tag (`v*`) is pushed to `master`.
2. [`.github/workflows/release.yml`](../.github/workflows/release.yml) checks out that tag on a
   GitHub-hosted runner, installs dependencies with `npm ci`, and runs the typecheck and the
   full test suite. A failure at either step stops the release.
3. The runner builds the installer with electron-builder from the checked-out source only.
4. The unsigned artifact is submitted to SignPath.io, where the signing request is reviewed
   and approved before a signature is issued.
5. The signed installer is attached to the GitHub release for that tag.

Because the build runs from a public workflow on a clean runner, the path from source to
signed artifact is reproducible and publicly auditable.

## Binary metadata

Signed binaries carry a fixed product name and the version of the release they belong to:

- **Product name:** `Klik`
- **Version:** the released version, e.g. `0.4.0`
- **Publisher:** as stated on the signing certificate

These are set in [`electron-builder.yml`](../electron-builder.yml) and are enforced as
metadata restrictions on the SignPath project, so a binary carrying different values cannot
be signed.

## Privacy

Klik has no telemetry, no analytics, and no crash reporting. It does not have a backend, does
not create an account, and does not transmit anything about you or your machine to the
project's maintainer — there is nowhere for such data to go.

The application does make outbound network requests, all of them to fetch public catalogue
data:

| Host | Why |
|---|---|
| `registry.modelcontextprotocol.io` | the public MCP server registry |
| `api.github.com`, `raw.githubusercontent.com` | skill catalogues and the curation feed |
| publisher websites | server and tool logos, fetched from each publisher's own domain |

Logos are requested directly from the publisher rather than through a third-party favicon
proxy, so browsing Klik does not hand a list of the servers you looked at to an unrelated
service. Requests carry no identifier beyond what any HTTP request necessarily reveals.

Secrets you enter for a server — API keys and similar — are written only into the local
configuration file of the client you chose to install into. They are not sent anywhere else.

## Reporting a problem

If you believe a Klik installer has been tampered with, or you find a signed binary that does
not match a tagged release, please open an issue at
https://github.com/adityasingh38/klik/issues.

---

Code signing policy last updated for v0.4.0.
