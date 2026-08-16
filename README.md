# brads-gstack-starter

A GitHub template repo for starting new projects wired up to
[apratsunrthd/gstack](https://github.com/apratsunrthd/gstack) — a personal fork of
[garrytan/gstack](https://github.com/garrytan/gstack).

## What this does

Any repo created from this template ships with:

- **`CLAUDE.md`** — a `## gstack (REQUIRED)` section telling Claude Code to verify
  gstack is installed globally before doing any work, and how to install it if not
  (pointed at the `apratsunrthd/gstack` fork, not upstream).
- **`.claude/hooks/check-gstack.sh`** — a `PreToolUse` hook that blocks Skill usage
  until gstack is installed at `~/.claude/skills/gstack`.
- **`.claude/settings.json`** — registers the hook above.

This mirrors gstack's own "team mode required" bootstrap
(`gstack-team-init required`), except it points installers at the
`apratsunrthd` fork instead of upstream `garrytan/gstack`.

## Using this template

Click **"Use this template" → "Create a new repository"** on GitHub, or:

```bash
gh repo create my-new-project --template apratsunrthd/brads-gstack-starter --clone
```

The first time you (or a teammate) open the new repo in Claude Code and try to use
a skill, you'll be blocked until gstack is installed:

```bash
git clone --single-branch --depth 1 https://github.com/apratsunrthd/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

After that, skills like `/office-hours`, `/review`, `/qa`, `/ship`, and `/browse`
are available in every session.

## Keeping this template in sync with your fork

This template only points at the fork's install URL — it doesn't vendor any gstack
code. If you rename or move `apratsunrthd/gstack`, update the URL in `CLAUDE.md` and
`.claude/hooks/check-gstack.sh` here.
