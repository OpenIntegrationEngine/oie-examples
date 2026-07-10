---
name: oie-plugin-development
description: >-
  Develop, scaffold, and build a plugin/extension for Open Integration Engine (OIE) or Mirth Connect.
  Use when creating a new OIE/Mirth plugin, setting up its Maven project (root/module POMs), writing the
  plugin.xml descriptor, implementing server-side or client-side (Administrator GUI) plugin classes, building
  a source/destination connector (subclassing a stock connector, settings panel, TLS-plugin compatibility),
  adding a REST servlet endpoint, doing database migrations (Migrator + MyBatis), handling permissions/event
  logging/XStream serialization, or packaging/signing the plugin .zip. NOT for engine-core changes or for
  channel/template JavaScript.
---

# OIE / Mirth plugin development

Build a plugin (extension) for the Open Integration Engine (OIE) — the open-source fork of Mirth Connect.
The detail lives in [`references/`](./references/), loaded on demand; this file is the map. Read the
reference for the task at hand rather than pulling in the whole guide.

> **Credit:** this skill is adapted from the **OIE Plugin Development Guide by
> [@pacmano1](https://github.com/pacmano1)** — the hard-won knowledge here is his. Thank you.

## First, the thing that surprises people
Plugins build with **Maven** (root POM + module POMs), even though the **engine itself builds with Ant**.
Don't mix them up: use the Maven workflow below for plugin work.

## Shape of a plugin
A plugin is a multi-module Maven project that produces an installable `.zip`:
- **server** module — classes the engine instantiates (services, REST servlets, migrators).
- **client** module — classes the **Administrator** GUI instantiates (panels, settings).
- **shared** module — types used by both.
- a **`plugin.xml`** descriptor wiring it together, and a **packaging/assembly** step that zips it.

## Typical workflow (→ reference for each step)
1. **Set up** the project — prerequisites, layout, scaffolding → [`references/project-structure.md`](./references/project-structure.md)
2. **Maven POMs** — root + module POMs, and the build commands → [`references/maven-poms.md`](./references/maven-poms.md)
3. **`plugin.xml`** descriptor → [`references/plugin-descriptor.md`](./references/plugin-descriptor.md)
4. **Server-side** plugin — services, **REST/servlet** endpoints, **permissions**, **event logging** → [`references/server-plugin.md`](./references/server-plugin.md)
5. **Client-side** (Administrator GUI) + **shared** module → [`references/client-and-shared.md`](./references/client-and-shared.md)
6. **Database** — Migrator + MyBatis → [`references/database.md`](./references/database.md)
7. **Package, sign, serialize** — assembly, code signing, XStream → [`references/packaging-signing-serialization.md`](./references/packaging-signing-serialization.md)
8. **Gotchas & a minimal working example** (read early — saves pain) → [`references/gotchas-and-example.md`](./references/gotchas-and-example.md)

**Building a source/destination connector?** That's a distinct shape (a connector descriptor + settings
panel, often subclassing a stock connector) with its own hard-won lessons — styling, live testing, and
staying compatible with TLS plugins → [`references/connector-plugins.md`](./references/connector-plugins.md).

## Router (jump straight to a task)
| I'm trying to… | Reference |
|---|---|
| Scaffold a new plugin / understand the layout / prerequisites | `references/project-structure.md` |
| Write or fix the root/module POMs; find the build command | `references/maven-poms.md` |
| Configure `plugin.xml` (classes, resources, version) | `references/plugin-descriptor.md` |
| Add a server service, a REST endpoint, permissions, or event logging | `references/server-plugin.md` |
| Add an Administrator-GUI panel or a shared type | `references/client-and-shared.md` |
| Build a **source/destination connector** (subclass a stock one, settings panel, TLS-plugin compat, live testing) | `references/connector-plugins.md` |
| Add/alter a table (Migrator) or a query (MyBatis) | `references/database.md` |
| Build the `.zip`, sign it (incl. the Administrator Launcher signing wall), or (de)serialize with XStream | `references/packaging-signing-serialization.md` |
| Debug a weird build/runtime problem; see a full tiny example | `references/gotchas-and-example.md` |

## Notes
- Most references are pacmano1's guide text, split by topic (each footers back to the source).
  `connector-plugins.md` and the Administrator-Launcher signing section are **field notes** from building a
  connector — additions to, not from, the original guide.
- This skill covers **building the plugin**. For JavaScript that runs *inside a channel* (transformers,
  filters, code templates), that's a different runtime (Rhino) with different rules — see the companion
  **`oie-channel-code-review`** skill.
