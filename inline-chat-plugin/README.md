# Inline Chat

iMessage-style chat notes for Obsidian. Drop a code block into any note and it turns into a chat thread — one bubble per message, with inline reply, edited timestamps, and proper mobile support.

Each message is stored as its own `.md` file in a sibling folder, so messages stay searchable, editable, and survive plugin uninstalls.

![demo](./docs/demo.png)

## Requirements

- Obsidian 1.4.0 or newer (mobile supported).
- The **Dataview** community plugin must be installed and enabled (the chat queries use Dataview's index).

## Usage

Place an `inline-chat` code block in any note:

````markdown
```inline-chat
```
````

That's it — the rendered block is the chat view. Each note's messages live in `<note-name>-messages/` next to the note, so you can have multiple independent threads (`journal.md`, `ideas.md`, etc.).

### Composing

- Type into the composer at the bottom of the chat.
- `Enter` to send, `Shift+Enter` for a newline.
- IME composition is detected, so the confirm-Enter from Hangul/Japanese/Chinese input methods will not accidentally send.

### Replying

- Hover (or tap, on mobile) one of your own bubbles to reveal the `↩` button.
- Click it — the composer enters reply mode with a preview chip of the original.
- Send. The reply renders as a gray bubble on the left (as if from another person), with a small quote of the original message above it.
- Click that quote to jump back to the original; press `Esc` or the chip's `×` to cancel reply mode.

### Editing & deleting

- Click any bubble to open its underlying `.md` file. Edit and save — the bubble now shows `edited` with the modification time.
- To delete a message, just delete its file.

## How messages are stored

Each message is a tiny `.md` file. Plain messages contain only the body. Replies get this frontmatter automatically:

```yaml
---
from: them
reply_to: "20260513-153045-123"
---
```

- `from: them` makes the bubble render on the left (received) side.
- `reply_to` points at the original message's basename (no extension).

You can edit these by hand to retarget replies or flip the rendered side.

## Mobile

Works on Obsidian Mobile (iOS / Android):

- Reply button and per-bubble timestamps stay visible on touch devices.
- Tap targets are enlarged on coarse pointers; the textarea is set to 16px so iOS Safari does not auto-zoom.
- Chat height uses `dvh` so it shrinks correctly when the soft keyboard appears.

## Building from source

```bash
npm install
npm run build
```

The build produces `main.js` next to `manifest.json` and `styles.css`. Copy those three files into `<vault>/.obsidian/plugins/inline-chat/` to install manually.

## License

MIT
