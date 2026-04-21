# Manual smoke matrix

Run before each release against a vault seeded by `scripts/seed-vault.ts`. Each row is pass/fail.

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Empty vault | Open a brand-new vault, install plugin, run `Tag Finder: Open` | Modal shows "No tags found in this vault." |
| 2 | Mixed inline + frontmatter | Seeded vault, `Tag Finder: Open` | Both `#work` (inline) and `#project/work` (frontmatter) appear with correct counts, deduped |
| 3 | Recent ordering | Pick `#daily`, close, reopen | `#daily` is first |
| 4 | emptyStateMode switches | Toggle each of the four settings | Next open reflects the new ordering; setting persists across reopens |
| 5 | Fuzzy matching | Type `wrk` | `#work`, `#project/work`, `#project/work/urgent` all match |
| 6 | Nested inclusion | Pick `#project` | Note list includes files tagged `#project/work`, `#project/work/urgent` |
| 7 | Prefix disambiguation | Pick `#project` | `Projection Study.md` (tagged `#projection`) is NOT in the list |
| 8 | Open: current pane | Highlight note, press Enter | Opens in current pane |
| 9 | Open: new tab | Cmd+Enter (mac) / Ctrl+Enter (win/linux) | Opens in new tab |
| 10 | Open: split | Shift+Enter | Opens in split |
| 11 | Back navigation | In note picker, empty the query, press Backspace | Returns to tag picker; tag-picker query is restored to what it was at pick time |
| 12 | QS hook: on | Cmd+O, type `#wor` | Built-in switcher closes, Tag Finder opens with `wor` pre-filled |
| 13 | QS hook: off | Disable hook in settings, Cmd+O, type `#` | Built-in switcher unchanged |
| 14 | Clear recent | Settings → "Clear recent tags", reopen | Recent list is empty |
| 15 | File deleted mid-flow | In note picker, delete highlighted file via Finder, press Enter | `Notice("File no longer exists.")`, no crash |
| 16 | Disable/enable cycle | Disable plugin, re-enable, open modal | Works; no duplicate DOM listener (verify by running #12 — only one reroute fires) |
