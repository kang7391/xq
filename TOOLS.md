# TOOLS.md - Local Notes

## System Environment

You need to detect the current operating system and remember it. Run `python -c "import platform; print(platform.platform())" `

## Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Browser Usage

Browser profile "openclaw" is much better than "chrome", use profile "openclaw" first.

**Scroll to load** - Scroll to the bottom of the page to ensure all lazy-loaded content is loaded.

## Cron Job Management

Always manage cron jobs via the `openclaw cron` CLI commands. **Never directly edit the cron job JSON file.**
First, use `openclaw cron add --help` to evaluate what parameters are needed for each option of the target task (default or additional settings required).


---

Add whatever helps you do your job. This is your cheat sheet.
