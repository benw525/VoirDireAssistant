---
name: Background jobs from ShellExec
description: How to launch and monitor long-running background processes (calibration runs etc.) so they survive shell teardown and polling doesn't false-positive.
---

# Background jobs launched from ShellExec

**Rule:** Launch long background jobs with `setsid nohup <direct binary> … > log 2>&1 < /dev/null &` invoking the real binary (e.g. `npx tsx script.ts`), NOT an npm wrapper. Verify liveness by (a) log file mtime/size advancing and (b) `ps -eo pid,etime,cmd | grep "patter[n]"` with the bracket trick — never bare `pgrep -f pattern`.

**Why:** Two failure modes observed on the same day: (1) `setsid nohup npm run calibrate &` died silently at shell teardown (log frozen at the header, no error) while a direct `npx tsx` launch survived — the npm wrapper's process tree doesn't reliably detach; (2) `pgrep -f calibrate-trials` matched the polling command's own `sh -c` wrapper, reporting STILL_RUNNING for ~25 minutes after the job was dead.

**How to apply:** After launching, in the same command sleep ~10s and check the log tail shows NEW output beyond the startup header. When polling, prefer `stat -c "size=%s mtime=%y" <log>` across two polls over process greps. If a grep is needed, break self-matching with a character class: `grep "calibrate-tria[l]s"`.

**Escalation (verified 2026-08-12):** even `setsid` + direct-binary launches get reaped by the platform ~10 minutes after the launching shell exits — zero error output, log just freezes. For any job longer than a few minutes, register it as a console workflow (`command | tee /tmp/job.log`) and restart the workflow to rerun; workflows survive indefinitely and the log is pollable.

**Never "syntax-check" a runnable script by importing it:** `npx tsx -e "import('script.ts')"` executes the module top level (for a calibration script, that means real paid API calls). Use `npx tsc --noEmit` or `node --check` instead.
