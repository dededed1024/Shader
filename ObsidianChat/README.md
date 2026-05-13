# Obsidian Chat

A lightweight chat-style note for Obsidian, designed for jotting down a few lines at a time. Works with **DataviewJS** alone — no custom plugin required.

## What it does

- Messages stack **oldest at the top** and the view **auto-scrolls to the latest** every time you open it.
- Each bubble shows the **time it was written**, plus **"edited" + modified time** if you change it later.
- A date separator appears automatically whenever the day changes or there's a gap of more than 15 minutes.
- **Click a bubble** to open its source `.md` file and edit it in place.
- **Hover your own bubble** to reveal an **↩ reply button**.

## Inline reply (iMessage style)

1. Hover over one of your bubbles and click the **↩** button on its left.
2. A **preview chip** appears above the composer showing the message you're replying to.
3. Type your reply and hit Enter → it renders as a **gray left-aligned bubble** (as if from another person), with a small quote of the original above it.
4. Click that quote to **scroll to the original message** — it briefly pulses to mark its location.
5. Cancel reply mode with the chip's **×** or by pressing **Esc**.

Storage — reply messages get this frontmatter automatically:

```yaml
---
from: them
reply_to: "20260513-153045-123"
---
```

`reply_to` is the basename (no extension) of the original message file. You can edit the frontmatter by hand to retarget the reply, or remove it to turn the reply back into a normal message.

## Setup

1. Install and enable the **Dataview** community plugin.
2. In Dataview's settings, turn on **Enable JavaScript Queries** (required).

## Install

Copy `Chat.md` from this folder into any location in your vault.

- A `<note-name>-messages/` folder is created next to the note; each message lives inside it as a small `.md` file.
- You can have multiple chat notes (`journal.md`, `ideas.md`, …) — each one is an independent thread.

## Usage

- Type into the composer at the bottom.
- `Enter` to send · `Shift + Enter` for a newline.
- IME composition is detected so the confirm-Enter from Korean/Japanese/Chinese input methods will not accidentally send.

## Edit / delete a message

- Click a bubble → its `.md` file opens → edit → save. The `mtime` updates and the bubble shows **"edited HH:mm"**.
- To delete a message, just delete its file.

## How it works

- Message filenames are timestamps (`YYYYMMDD-HHMMSS-mmm.md`) so they sort naturally.
- Sort key is `file.ctime` (write time); the "edited" indicator compares against `file.mtime`.
- DataviewJS re-renders the view whenever files in the messages folder change.

## Mobile

Works on Obsidian Mobile (iOS / Android). Touch-specific tweaks:

- Reply button and per-bubble timestamps are always visible on touch devices (no hover dependency).
- Tap targets are enlarged on coarse pointers; the textarea uses 16px so iOS Safari doesn't auto-zoom on focus.
- Chat height uses `dvh` so the view shrinks correctly when the soft keyboard appears.
