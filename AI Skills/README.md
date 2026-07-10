# AI Skills for OIE developers

Skills for AI coding agents that read `SKILL.md` files — they help you **build and review** Open
Integration Engine plugins and channels. Each skill is a folder; a `SKILL.md` holds the instructions and
(where present) a `references/` folder holds detail loaded on demand.

| Skill | Use it to… |
|---|---|
| [`oie-plugin-development/`](./oie-plugin-development/) | **Build** a plugin: Maven project setup, `plugin.xml`, server/client/shared classes, REST servlets, DB migrations, packaging & signing. |
| [`oie-plugin-code-review/`](./oie-plugin-code-review/) | **Review Java/plugin code** — smells, thread/resource safety, JDBC & migrations, security/PHI, plugin lifecycle, tests, static-analysis findings. |
| [`oie-channel-code-review/`](./oie-channel-code-review/) | **Review channel/template JavaScript** (the Rhino runtime) — block-scoping traps, E4X/HL7 field access, scope-map lifetime, per-message cost, PHI in logs. |

Plugin *building* and channel *JavaScript* are different runtimes with different rules, so the two review
skills are deliberately separate — use the one that matches what you're reviewing.

## Install
Copy the skill folder(s) you want into the skills directory your agent reads (global or per-project — see
your tool's docs). For example:

```bash
cp -r "AI Skills/oie-plugin-development" <your-agent-skills-dir>/
```

Then invoke it by name or let your agent pick it up from the `SKILL.md` description.

## Credit
These skills are adapted from work by **[@pacmano1](https://github.com/pacmano1)** — the OIE Plugin
Development Guide and the "Irritable Developer Check" review checklist. Thank you. Content has been
reorganized into the skill format (and the two review skills split by runtime); the domain knowledge is his.
