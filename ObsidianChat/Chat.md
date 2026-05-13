```dataviewjs
// DataviewJS chat view. Each message is a separate .md file in "<this note>-messages/".
// Reply messages render on the opposite side via `from: them`; original is tracked by `reply_to`.

const cur = dv.current().file;
const FOLDER = (cur.folder ? cur.folder + "/" : "") + cur.name + "-messages";

if (!app.vault.getAbstractFileByPath(FOLDER)) {
    await app.vault.createFolder(FOLDER);
}

const root = dv.el("div", "", { cls: "kchat-root" });
const style = root.createEl("style");
style.textContent = `
.kchat-root {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
                 "Apple SD Gothic Neo", "Helvetica Neue", sans-serif;
}
.kchat-scroll {
    display: flex; flex-direction: column; gap: 1px;
    max-height: 62vh; overflow-y: auto;
    padding: 14px 12px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 14px;
}
.kchat-date {
    align-self: center;
    color: var(--text-muted);
    padding: 10px 0 6px 0;
    font-size: 0.72em; font-weight: 600;
    letter-spacing: 0.2px;
    text-align: center;
}
.kchat-date .kchat-date-time {
    font-weight: 400; margin-left: 6px; opacity: 0.85;
}
.kchat-row {
    display: flex; align-items: flex-end; gap: 6px;
    justify-content: flex-end; margin: 1px 0;
}
.kchat-meta {
    display: flex; flex-direction: column; align-items: flex-end;
    font-size: 0.66em; color: var(--text-faint);
    line-height: 1.15; padding-bottom: 3px;
    min-width: 38px; opacity: 0;
    transition: opacity 0.15s ease;
}
.kchat-row:hover .kchat-meta { opacity: 1; }
.kchat-meta .kchat-edited { color: var(--text-accent); font-size: 0.95em; }
.kchat-bubble-col {
    display: flex; flex-direction: column;
    align-items: flex-end; gap: 2px;
    max-width: 72%; min-width: 0;
}
.kchat-row.kchat-them .kchat-bubble-col { align-items: flex-start; }
.kchat-bubble {
    max-width: 100%;
    padding: 8px 13px;
    background: linear-gradient(180deg, #2AA4FF 0%, #007AFF 100%);
    color: #fff;
    border-radius: 19px;
    white-space: pre-wrap; word-break: break-word;
    line-height: 1.38; font-size: 0.95em;
    cursor: pointer;
    box-shadow: 0 1px 1px rgba(0,0,0,0.06);
    transition: filter 0.1s, box-shadow 0.3s;
    position: relative;
}
.kchat-reply-quote {
    max-width: 100%;
    padding: 4px 12px;
    background: var(--background-secondary);
    color: var(--text-muted);
    border-radius: 12px;
    font-size: 0.76em; line-height: 1.3;
    cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    border-left: 3px solid #007AFF;
    opacity: 0.85; transition: opacity 0.15s;
}
.kchat-reply-quote:hover { opacity: 1; }
.kchat-row.kchat-them .kchat-reply-quote {
    border-left: none; border-right: 3px solid #007AFF;
}
.kchat-reply-btn {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: var(--background-modifier-hover);
    color: var(--text-muted);
    border: none; cursor: pointer; padding: 0;
    font-size: 0.85em;
    opacity: 0; pointer-events: none;
    transition: opacity 0.15s, background 0.15s;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.kchat-row:hover .kchat-reply-btn { opacity: 0.7; pointer-events: auto; }
.kchat-reply-btn:hover { opacity: 1; background: #007AFF; color: #fff; }
.kchat-highlight .kchat-bubble {
    animation: kchat-pulse 1.4s ease;
}
@keyframes kchat-pulse {
    0%, 100% { box-shadow: 0 1px 1px rgba(0,0,0,0.06); }
    30%      { box-shadow: 0 0 0 4px rgba(0,122,255,0.45); }
}
.kchat-bubble:hover { filter: brightness(0.96); }
.kchat-row.kchat-tail .kchat-bubble::after {
    content: ""; position: absolute;
    right: -6px; bottom: 0;
    width: 14px; height: 17px;
    background: #007AFF;
    border-bottom-left-radius: 14px 12px;
    z-index: -1;
}
.kchat-row.kchat-tail .kchat-bubble::before {
    content: ""; position: absolute;
    right: -10px; bottom: 0;
    width: 10px; height: 17px;
    background: var(--background-primary);
    border-bottom-left-radius: 10px;
    z-index: -1;
}
.kchat-row.kchat-them { justify-content: flex-start; }
.kchat-row.kchat-them .kchat-meta {
    order: 2; align-items: flex-start;
}
.kchat-row.kchat-them .kchat-bubble {
    background: #E9E9EB; color: #000;
}
.theme-dark .kchat-row.kchat-them .kchat-bubble {
    background: #3B3B3D; color: #fff;
}
.kchat-row.kchat-them.kchat-tail .kchat-bubble::after {
    right: auto; left: -6px;
    background: #E9E9EB;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 14px 12px;
}
.theme-dark .kchat-row.kchat-them.kchat-tail .kchat-bubble::after {
    background: #3B3B3D;
}
.kchat-row.kchat-them.kchat-tail .kchat-bubble::before {
    right: auto; left: -10px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 10px;
}
.kchat-empty {
    color: var(--text-muted); text-align: center;
    padding: 18px; font-size: 0.85em;
}
.kchat-input {
    display: flex; gap: 6px; margin-top: 12px; align-items: flex-end;
}
.kchat-input textarea {
    flex: 1; min-height: 36px; max-height: 140px;
    padding: 8px 14px;
    border-radius: 18px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    color: var(--text-normal);
    resize: none; outline: none;
    font-family: inherit; font-size: 0.95em; line-height: 1.4;
}
.kchat-input textarea:focus { border-color: #007AFF; }
.kchat-input button {
    height: 36px; width: 36px; padding: 0;
    border-radius: 50%; border: none;
    background: #007AFF; color: #fff;
    font-weight: 700; cursor: pointer; font-size: 1.1em;
    font-family: inherit;
    display: flex; align-items: center; justify-content: center;
}
.kchat-input button:disabled {
    background: var(--background-modifier-border);
    cursor: default;
}
.kchat-input button:active:not(:disabled) { transform: scale(0.94); }
.kchat-composer { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.kchat-composer textarea { width: 100%; box-sizing: border-box; }
.kchat-reply-preview {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    background: var(--background-secondary);
    border-radius: 10px;
    border-left: 3px solid #007AFF;
    font-size: 0.82em;
}
.kchat-reply-preview-text {
    flex: 1; min-width: 0; color: var(--text-muted);
    display: flex; flex-direction: column;
}
.kchat-reply-preview-text > .kchat-reply-preview-body {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kchat-reply-preview-label {
    color: #007AFF; font-weight: 600; font-size: 0.78em;
    margin-bottom: 2px;
}
.kchat-reply-preview-cancel {
    background: transparent; border: none;
    color: var(--text-muted); cursor: pointer;
    font-size: 1.1em; padding: 0 4px; line-height: 1;
    flex-shrink: 0;
}
.kchat-reply-preview-cancel:hover { color: var(--text-normal); }
`;

const pages = dv.pages(`"${FOLDER}"`)
    .sort(p => p.file.ctime, 'asc')
    .array();

const scroll = root.createDiv({ cls: "kchat-scroll" });
if (pages.length === 0) {
    scroll.createDiv({ cls: "kchat-empty", text: "아직 메시지가 없어요. 아래에 적어보세요." });
}

const preview = (s, n) => s.replace(/\s+/g, " ").slice(0, n);
const ko = (dt) => dt.setLocale("ko");
const fmtTime = (dt) => ko(dt).toFormat("a h:mm");
const fmtDayLabel = (dt) => ko(dt).toFormat("cccc, M월 d일");
const minuteBucket = (dt) => Math.floor(dt.toMillis() / 60000);
const sameCluster = (a, b) =>
    !!a && !!b && a.from === b.from && minuteBucket(a.created) === minuteBucket(b.created);

const inputBox = root.createDiv({ cls: "kchat-input" });
const composer = inputBox.createDiv({ cls: "kchat-composer" });

const replyPreview = composer.createDiv({ cls: "kchat-reply-preview" });
replyPreview.style.display = "none";
const replyTextWrap = replyPreview.createDiv({ cls: "kchat-reply-preview-text" });
replyTextWrap.createDiv({ cls: "kchat-reply-preview-label", text: "↩ 답장하는 메시지" });
const replyBodyEl = replyTextWrap.createDiv({ cls: "kchat-reply-preview-body" });
const replyCancelBtn = replyPreview.createEl("button", {
    cls: "kchat-reply-preview-cancel",
    text: "×",
    attr: { "aria-label": "답장 취소", "title": "답장 취소 (Esc)" }
});

const ta = composer.createEl("textarea", { attr: { placeholder: "iMessage" } });
const btn = inputBox.createEl("button", {
    text: "↑",
    attr: { "aria-label": "전송", "title": "전송 (Enter)" }
});
btn.disabled = true;

let replyTo = null;

const enterReplyMode = (basename, originalText) => {
    replyTo = basename;
    replyBodyEl.textContent = preview(originalText, 120);
    replyPreview.style.display = "flex";
    ta.placeholder = "답장…";
    ta.focus();
};
const cancelReply = () => {
    replyTo = null;
    replyPreview.style.display = "none";
    ta.placeholder = "iMessage";
};
replyCancelBtn.onclick = cancelReply;

const send = async () => {
    const txt = ta.value.trim();
    if (!txt) return;
    const stamp = dv.luxon.DateTime.now().toFormat("yyyyMMdd-HHmmss-SSS");
    const path = `${FOLDER}/${stamp}.md`;
    // Replies are stored as `from: them` so they render on the opposite (received) side.
    const body = replyTo
        ? `---\nfrom: them\nreply_to: "${replyTo}"\n---\n${txt}`
        : txt;
    try {
        await app.vault.create(path, body);
        ta.value = "";
        ta.style.height = "auto";
        cancelReply();
        ta.focus();
    } catch (e) {
        new Notice("메시지 저장 실패: " + e.message);
    }
};
btn.onclick = send;

ta.addEventListener("keydown", (e) => {
    // Ignore Enter during IME composition so Hangul confirm-Enter doesn't send.
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        send();
    } else if (e.key === "Escape" && replyTo) {
        e.preventDefault();
        cancelReply();
    }
});

ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    btn.disabled = ta.value.trim().length === 0;
});

const scrollWithin = (child) => {
    const cRect = scroll.getBoundingClientRect();
    const chRect = child.getBoundingClientRect();
    const top = scroll.scrollTop + (chRect.top - cRect.top)
              - (scroll.clientHeight - child.clientHeight) / 2;
    scroll.scrollTo({ top, behavior: "smooth" });
};

const contents = await Promise.all(pages.map(p => {
    const f = app.vault.getAbstractFileByPath(p.file.path);
    return f ? app.vault.cachedRead(f).catch(() => "") : Promise.resolve("");
}));

const messages = [];
const byBasename = new Map();

let lastDateKey = "";
for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const created = p.file.ctime;
    const modified = p.file.mtime;

    const dateKey = created.toFormat("yyyy-LL-dd");
    const prevCreated = i > 0 ? pages[i - 1].file.ctime : null;
    const gap = prevCreated ? created.toMillis() - prevCreated.toMillis() : Infinity;
    if (dateKey !== lastDateKey || gap > 15 * 60_000) {
        const label = scroll.createDiv({ cls: "kchat-date" });
        label.createSpan({ text: fmtDayLabel(created) });
        label.createSpan({ cls: "kchat-date-time", text: " · " + fmtTime(created) });
        lastDateKey = dateKey;
    }

    const content = contents[i].replace(/^---\n[\s\S]*?\n---\s*/, "").trim();
    const isMine = p.from !== "them";
    const replyToBasename = (typeof p.reply_to === "string") ? p.reply_to : null;

    const row = scroll.createDiv({ cls: "kchat-row" + (isMine ? "" : " kchat-them") });

    const meta = row.createDiv({ cls: "kchat-meta" });
    if (modified.toMillis() - created.toMillis() > 2000) {
        meta.createDiv({ cls: "kchat-edited", text: "편집됨" });
        meta.createDiv({ text: fmtTime(modified) });
    } else {
        meta.createDiv({ text: fmtTime(created) });
    }

    if (isMine) {
        const replyBtn = row.createEl("button", {
            cls: "kchat-reply-btn",
            text: "↩",
            attr: { title: "이 메시지에 답장" }
        });
        replyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            enterReplyMode(p.file.name, content);
        });
    }

    const bcol = row.createDiv({ cls: "kchat-bubble-col" });

    if (replyToBasename) {
        const original = byBasename.get(replyToBasename);
        const quote = bcol.createDiv({ cls: "kchat-reply-quote" });
        if (original) {
            quote.textContent = preview(original.content, 100);
            quote.addEventListener("click", (e) => {
                e.stopPropagation();
                scrollWithin(original.row);
                original.row.classList.add("kchat-highlight");
                setTimeout(() => original.row.classList.remove("kchat-highlight"), 1500);
            });
        } else {
            quote.textContent = "(원본을 찾을 수 없음)";
            quote.style.fontStyle = "italic";
        }
    }

    const bubble = bcol.createDiv({ cls: "kchat-bubble", text: content });
    bubble.addEventListener("click", () => {
        app.workspace.openLinkText(p.file.path, "", false);
    });

    const msg = { basename: p.file.name, content, row, created, from: isMine ? "me" : "them" };
    messages.push(msg);
    byBasename.set(msg.basename, msg);
}

for (let i = 0; i < messages.length; i++) {
    if (!sameCluster(messages[i], messages[i + 1])) {
        messages[i].row.classList.add("kchat-tail");
    }
}

// Double rAF: wait for the second frame so layout has settled before snapping to bottom.
requestAnimationFrame(() => requestAnimationFrame(() => {
    scroll.scrollTop = scroll.scrollHeight;
}));
```
