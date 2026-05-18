# pnpm-Only UI Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ltbase-controlplane-ui` consistently use `pnpm` instead of `npm` for docs, CI, and local release-artifact commands.

**Architecture:** Keep the change scoped to the UI repository. Update human-facing commands, CI setup, and package metadata so the repository signals one package manager clearly. Remove the npm lockfile to avoid mixed-lockfile drift.

**Tech Stack:** pnpm, GitHub Actions, Node.js, Vite

---

### Task 1: Normalize package-manager usage

**Files:**
- Modify: `package.json`
- Delete: `package-lock.json`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`

- [ ] Replace `npm` commands with `pnpm` in scripts, docs, and CI.
- [ ] Add `packageManager` metadata to `package.json`.
- [ ] Remove `package-lock.json` so the repo keeps only `pnpm-lock.yaml`.
- [ ] Verify with `pnpm install --frozen-lockfile` and `pnpm build:release-artifact`.
