```dataviewjs
// =====================================================================
//  KakaoChat - DataviewJS 채팅뷰
//  - 이 노트 옆에 "<이 노트 이름>-messages" 폴더가 자동 생성됩니다.
//  - 각 메시지는 그 폴더 안에 작은 .md 파일 하나로 저장됩니다.
//  - 말풍선을 클릭하면 해당 파일이 열려서 바로 수정 가능합니다.
//    파일을 수정하면 "수정됨 HH:mm" 이 자동으로 표시됩니다.
// =====================================================================

// ---- 메시지 폴더 위치 (이 노트와 같은 폴더의 하위 폴더) ----
const cur = dv.current().file;
const baseDir = cur.folder ?? "";
const FOLDER = (baseDir ? baseDir + "/" : "") + cur.name + "-messages";

// ---- 폴더 없으면 생성 ----
if (!app.vault.getAbstractFileByPath(FOLDER)) {
    await app.vault.createFolder(FOLDER);
}

// ---- 스타일 ----
const root = dv.el("div", "", { cls: "kchat-root" });
const style = root.createEl("style");
style.textContent = `
.kchat-root {
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "Helvetica Neue", sans-serif;
}
.kchat-scroll {
    display: flex; flex-direction: column; gap: 2px;
    max-height: 62vh; overflow-y: auto;
    padding: 14px 12px;
    background: #B2C7DA;
    border-radius: 14px;
    scroll-behavior: smooth;
}
.kchat-date {
    align-self: center;
    background: rgba(0,0,0,0.25); color: #fff;
    padding: 3px 12px; border-radius: 12px;
    font-size: 0.75em; margin: 10px 0 6px 0;
    letter-spacing: 0.5px;
}
.kchat-row {
    display: flex; align-items: flex-end; gap: 6px;
    justify-content: flex-end; margin: 2px 0;
}
.kchat-meta {
    display: flex; flex-direction: column; align-items: flex-end;
    font-size: 0.68em; color: #2c3a47; opacity: 0.85;
    line-height: 1.15; padding-bottom: 2px;
    min-width: 38px;
}
.kchat-meta .kchat-edited { color: #b33; font-size: 0.92em; }
.kchat-bubble {
    max-width: 78%;
    padding: 7px 11px;
    background: #FEE500; color: #111;
    border-radius: 14px 14px 2px 14px;
    white-space: pre-wrap; word-break: break-word;
    line-height: 1.42; font-size: 0.96em;
    cursor: pointer;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04);
    transition: filter 0.1s;
}
.kchat-bubble:hover { filter: brightness(0.97); }
.kchat-empty {
    color: #5a6e80; text-align: center;
    padding: 18px; font-size: 0.85em;
}
.kchat-input {
    display: flex; gap: 6px; margin-top: 10px; align-items: flex-end;
}
.kchat-input textarea {
    flex: 1; min-height: 38px; max-height: 140px;
    padding: 9px 12px;
    border-radius: 18px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-primary);
    color: var(--text-normal);
    resize: none; outline: none;
    font-family: inherit; font-size: 0.95em; line-height: 1.4;
}
.kchat-input textarea:focus {
    border-color: var(--interactive-accent);
}
.kchat-input button {
    height: 38px; padding: 0 16px;
    border-radius: 18px; border: none;
    background: #FEE500; color: #111;
    font-weight: 700; cursor: pointer;
    font-family: inherit;
}
.kchat-input button:active { transform: translateY(1px); }
`;

// ---- 메시지 목록 ----
const pages = dv.pages(`"${FOLDER}"`)
    .sort(p => p.file.ctime, 'asc')
    .array();

const scroll = root.createDiv({ cls: "kchat-scroll" });

if (pages.length === 0) {
    scroll.createDiv({ cls: "kchat-empty", text: "아직 메시지가 없어요. 아래에 적어보세요." });
}

const fmtTime = (dt) => dt.toFormat("a h:mm")
    .replace("AM", "오전").replace("PM", "오후");
const fmtDate = (dt) => dt.toFormat("yyyy년 M월 d일 cccc", { locale: "ko" });

let lastDateKey = "";
for (const p of pages) {
    const created = p.file.ctime;
    const modified = p.file.mtime;

    // 날짜 구분선
    const dateKey = created.toFormat("yyyy-MM-dd");
    if (dateKey !== lastDateKey) {
        scroll.createDiv({ cls: "kchat-date", text: fmtDate(created) });
        lastDateKey = dateKey;
    }

    // 내용 읽기 (frontmatter 제거)
    const fileObj = app.vault.getAbstractFileByPath(p.file.path);
    let raw = "";
    try { raw = await app.vault.read(fileObj); } catch (_) {}
    const content = raw.replace(/^---[\s\S]*?---\s*/m, "").trim();

    const row = scroll.createDiv({ cls: "kchat-row" });

    const meta = row.createDiv({ cls: "kchat-meta" });
    const edited = modified.toMillis() - created.toMillis() > 2000;
    if (edited) {
        meta.createDiv({ cls: "kchat-edited", text: "수정됨" });
        meta.createDiv({ text: fmtTime(modified) });
    } else {
        meta.createDiv({ text: fmtTime(created) });
    }

    const bubble = row.createDiv({ cls: "kchat-bubble", text: content });
    bubble.addEventListener("click", () => {
        app.workspace.openLinkText(p.file.path, "", false);
    });
}

// 최신 메시지가 보이도록 자동 스크롤
requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });

// ---- 입력창 ----
const inputBox = root.createDiv({ cls: "kchat-input" });
const ta = inputBox.createEl("textarea", {
    attr: { placeholder: "메시지 입력 — Enter 전송 · Shift+Enter 줄바꿈" }
});
const btn = inputBox.createEl("button", { text: "전송" });

const pad = (n) => String(n).padStart(2, "0");
const send = async () => {
    const txt = ta.value.trim();
    if (!txt) return;
    const now = new Date();
    const stamp =
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}` +
        `-${String(now.getMilliseconds()).padStart(3, "0")}`;
    const path = `${FOLDER}/${stamp}.md`;
    try {
        await app.vault.create(path, txt);
        ta.value = "";
        ta.style.height = "auto";
        ta.focus();
    } catch (e) {
        new Notice("메시지 저장 실패: " + e.message);
    }
};

btn.onclick = send;

ta.addEventListener("keydown", (e) => {
    // 한글 IME 조합 중에는 무시 (조합 확정용 Enter가 전송으로 새는 것 방지)
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        send();
    }
});

// 입력 줄 수에 따라 자동 높이
ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
});
```
