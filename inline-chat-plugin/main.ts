import {
    MarkdownPostProcessorContext,
    Notice,
    Plugin,
    TFile,
    normalizePath,
} from "obsidian";

interface LuxonDateTime {
    toMillis(): number;
    toFormat(fmt: string): string;
}

interface DataviewApi {
    pages: (source: string) => {
        sort: (cb: (p: PageEntry) => unknown, direction?: "asc" | "desc") => {
            array: () => PageEntry[];
        };
    };
    luxon: {
        DateTime: { now: () => LuxonDateTime };
    };
}

interface PageEntry {
    file: {
        path: string;
        name: string;
        ctime: LuxonDateTime;
        mtime: LuxonDateTime;
    };
    from?: string;
    reply_to?: string;
}

interface Message {
    basename: string;
    content: string;
    row: HTMLElement;
    created: LuxonDateTime;
    from: "me" | "them";
}

export default class InlineChatPlugin extends Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor(
            "inline-chat",
            async (_source, el, ctx) => {
                try {
                    await this.renderChat(el, ctx);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    el.createDiv({ cls: "ic-error", text: "Inline Chat: " + msg });
                }
            }
        );
    }

    onunload() {}

    private getDataview(): DataviewApi | null {
        const plugins = (this.app as unknown as { plugins?: { plugins?: Record<string, { api?: DataviewApi }> } }).plugins;
        return plugins?.plugins?.dataview?.api ?? null;
    }

    private resolveFolder(ctx: MarkdownPostProcessorContext): string | null {
        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile)) return null;
        const parent = file.parent?.path ?? "";
        const prefix = parent && parent !== "/" ? parent + "/" : "";
        return normalizePath(prefix + file.basename + "-messages");
    }

    private async renderChat(
        host: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        const dv = this.getDataview();
        if (!dv) {
            host.createDiv({
                cls: "ic-error",
                text:
                    "Inline Chat needs the Dataview plugin. " +
                    "Install and enable it from Settings → Community plugins.",
            });
            return;
        }

        const folder = this.resolveFolder(ctx);
        if (!folder) {
            host.createDiv({
                cls: "ic-error",
                text: "Inline Chat: could not resolve the current note's path.",
            });
            return;
        }

        if (!this.app.vault.getAbstractFileByPath(folder)) {
            await this.app.vault.createFolder(folder);
        }

        const root = host.createDiv({ cls: "ic-root" });

        const pages: PageEntry[] = dv
            .pages(`"${folder}"`)
            .sort((p) => p.file.ctime, "asc")
            .array();

        const scroll = root.createDiv({ cls: "ic-scroll" });
        if (pages.length === 0) {
            scroll.createDiv({
                cls: "ic-empty",
                text: "No messages yet. Start typing below.",
            });
        }

        const previewText = (s: string, n: number) => s.replace(/\s+/g, " ").slice(0, n);
        const fmtTime = (dt: LuxonDateTime) => dt.toFormat("h:mm a");
        const fmtDayLabel = (dt: LuxonDateTime) => dt.toFormat("cccc, LLLL d");
        const minuteBucket = (dt: LuxonDateTime) => Math.floor(dt.toMillis() / 60000);
        const sameCluster = (a?: Message, b?: Message) =>
            !!a && !!b && a.from === b.from
                && minuteBucket(a.created) === minuteBucket(b.created);

        const inputBox = root.createDiv({ cls: "ic-input" });
        const composer = inputBox.createDiv({ cls: "ic-composer" });

        const replyPreview = composer.createDiv({ cls: "ic-reply-preview" });
        replyPreview.style.display = "none";
        const replyTextWrap = replyPreview.createDiv({ cls: "ic-reply-preview-text" });
        replyTextWrap.createDiv({ cls: "ic-reply-preview-label", text: "↩ Replying to" });
        const replyBodyEl = replyTextWrap.createDiv({ cls: "ic-reply-preview-body" });
        const replyCancelBtn = replyPreview.createEl("button", {
            cls: "ic-reply-preview-cancel",
            text: "×",
            attr: { "aria-label": "Cancel reply", title: "Cancel reply (Esc)" },
        });

        const ta = composer.createEl("textarea", {
            attr: { placeholder: "iMessage" },
        });
        const btn = inputBox.createEl("button", {
            text: "↑",
            attr: { "aria-label": "Send", title: "Send (Enter)" },
        });
        btn.disabled = true;

        let replyTo: string | null = null;

        const enterReplyMode = (basename: string, originalText: string) => {
            replyTo = basename;
            replyBodyEl.textContent = previewText(originalText, 120);
            replyPreview.style.display = "flex";
            ta.placeholder = "Reply…";
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
            const path = `${folder}/${stamp}.md`;
            const body = replyTo
                ? `---\nfrom: them\nreply_to: "${replyTo}"\n---\n${txt}`
                : txt;
            try {
                await this.app.vault.create(path, body);
                ta.value = "";
                ta.style.height = "auto";
                cancelReply();
                ta.focus();
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                new Notice("Failed to save message: " + msg);
            }
        };
        btn.onclick = send;

        ta.addEventListener("keydown", (e) => {
            // Ignore Enter during IME composition so Hangul/CJK confirm-Enter doesn't send.
            if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                void send();
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

        const scrollWithin = (child: HTMLElement) => {
            const cRect = scroll.getBoundingClientRect();
            const chRect = child.getBoundingClientRect();
            const top = scroll.scrollTop + (chRect.top - cRect.top)
                      - (scroll.clientHeight - child.clientHeight) / 2;
            scroll.scrollTo({ top, behavior: "smooth" });
        };

        const contents = await Promise.all(
            pages.map((p) => {
                const f = this.app.vault.getAbstractFileByPath(p.file.path);
                return f instanceof TFile
                    ? this.app.vault.cachedRead(f).catch(() => "")
                    : Promise.resolve("");
            })
        );

        const messages: Message[] = [];
        const byBasename = new Map<string, Message>();

        let lastDateKey = "";
        for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const created = p.file.ctime;
            const modified = p.file.mtime;

            const dateKey = created.toFormat("yyyy-LL-dd");
            const prevCreated = i > 0 ? pages[i - 1].file.ctime : null;
            const gap = prevCreated ? created.toMillis() - prevCreated.toMillis() : Infinity;
            if (dateKey !== lastDateKey || gap > 15 * 60_000) {
                const label = scroll.createDiv({ cls: "ic-date" });
                label.createSpan({ text: fmtDayLabel(created) });
                label.createSpan({ cls: "ic-date-time", text: " · " + fmtTime(created) });
                lastDateKey = dateKey;
            }

            const content = contents[i].replace(/^---\n[\s\S]*?\n---\s*/, "").trim();
            const isMine = p.from !== "them";
            const replyToBasename = typeof p.reply_to === "string" ? p.reply_to : null;

            const row = scroll.createDiv({ cls: "ic-row" + (isMine ? "" : " ic-them") });

            const meta = row.createDiv({ cls: "ic-meta" });
            if (modified.toMillis() - created.toMillis() > 2000) {
                meta.createDiv({ cls: "ic-edited", text: "edited" });
                meta.createDiv({ text: fmtTime(modified) });
            } else {
                meta.createDiv({ text: fmtTime(created) });
            }

            if (isMine) {
                const replyBtn = row.createEl("button", {
                    cls: "ic-reply-btn",
                    text: "↩",
                    attr: { title: "Reply to this message" },
                });
                replyBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    enterReplyMode(p.file.name, content);
                });
            }

            const bcol = row.createDiv({ cls: "ic-bubble-col" });

            if (replyToBasename) {
                const original = byBasename.get(replyToBasename);
                const quote = bcol.createDiv({ cls: "ic-reply-quote" });
                if (original) {
                    quote.textContent = previewText(original.content, 100);
                    quote.addEventListener("click", (e) => {
                        e.stopPropagation();
                        scrollWithin(original.row);
                        original.row.classList.add("ic-highlight");
                        setTimeout(() => original.row.classList.remove("ic-highlight"), 1500);
                    });
                } else {
                    quote.textContent = "(original not found)";
                    quote.style.fontStyle = "italic";
                }
            }

            const bubble = bcol.createDiv({ cls: "ic-bubble", text: content });
            bubble.addEventListener("click", () => {
                this.app.workspace.openLinkText(p.file.path, "", false);
            });

            const msg: Message = {
                basename: p.file.name,
                content,
                row,
                created,
                from: isMine ? "me" : "them",
            };
            messages.push(msg);
            byBasename.set(msg.basename, msg);
        }

        for (let i = 0; i < messages.length; i++) {
            if (!sameCluster(messages[i], messages[i + 1])) {
                messages[i].row.classList.add("ic-tail");
            }
        }

        // Wait for layout to settle before snapping to the bottom on initial mount.
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                scroll.scrollTop = scroll.scrollHeight;
            })
        );
    }
}
