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
    scroll-behavior: smooth;
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
.kchat-bubble {
    max-width: 72%;
    padding: 8px 13px;
    background: linear-gradient(180deg, #2AA4FF 0%, #007AFF 100%);
    color: #fff;
    border-radius: 19px;
    white-space: pre-wrap; word-break: break-word;
    line-height: 1.38; font-size: 0.95em;
    cursor: pointer;
    box-shadow: 0 1px 1px rgba(0,0,0,0.06);
    transition: filter 0.1s;
    position: relative;
}
.kchat-bubble:hover { filter: brightness(0.96); }
/* iMessage 꼬리 - 오른쪽 아래 */
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
.kchat-input textarea:focus {
    border-color: #007AFF;
}
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
const fmtDateLabel = (dt) => {
    // iMessage 라벨 스타일: "수요일, 5월 13일 · 오후 3:42"
    const dayLabel = dt.toFormat("cccc, M월 d일", { locale: "ko" });
    return { day: dayLabel, time: fmtTime(dt) };
};

// 연속된 메시지 묶음의 마지막에만 꼬리를 붙이기 위해 같은 분(minute) 인지 비교
const sameCluster = (a, b) => {
    if (!a || !b) return false;
    return Math.abs(b.toMillis() - a.toMillis()) < 60_000
        && a.toFormat("yyyyMMddHHmm") === b.toFormat("yyyyMMddHHmm");
};

let lastDateKey = "";
let lastTimeLabel = "";
const rows = [];
for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const created = p.file.ctime;
    const modified = p.file.mtime;

    // 날짜/시간 구분선: 날짜가 바뀌거나, 15분 이상 텀이 생기면 새 라벨
    const dateKey = created.toFormat("yyyy-MM-dd");
    const prev = i > 0 ? pages[i - 1].file.ctime : null;
    const gap = prev ? created.toMillis() - prev.toMillis() : Infinity;
    if (dateKey !== lastDateKey || gap > 15 * 60_000) {
        const { day, time } = fmtDateLabel(created);
        const label = scroll.createDiv({ cls: "kchat-date" });
        label.createSpan({ text: day });
        label.createSpan({ cls: "kchat-date-time", text: " · " + time });
        lastDateKey = dateKey;
        lastTimeLabel = time;
    }

    // 내용 읽기 (frontmatter 제거)
    const fileObj = app.vault.getAbstractFileByPath(p.file.path);
    let raw = "";
    try { raw = await app.vault.read(fileObj); } catch (_) {}
    const content = raw.replace(/^---[\s\S]*?---\s*/m, "").trim();

    const row = scroll.createDiv({ cls: "kchat-row" });
    rows.push({ row, created, modified });

    const meta = row.createDiv({ cls: "kchat-meta" });
    const edited = modified.toMillis() - created.toMillis() > 2000;
    if (edited) {
        meta.createDiv({ cls: "kchat-edited", text: "편집됨" });
        meta.createDiv({ text: fmtTime(modified) });
    } else {
        meta.createDiv({ text: fmtTime(created) });
    }

    const bubble = row.createDiv({ cls: "kchat-bubble", text: content });
    bubble.addEventListener("click", () => {
        app.workspace.openLinkText(p.file.path, "", false);
    });
}

// 클러스터의 마지막 메시지에만 꼬리 부착
for (let i = 0; i < rows.length; i++) {
    const next = rows[i + 1];
    if (!next || !sameCluster(rows[i].created, next.created)) {
        rows[i].row.classList.add("kchat-tail");
    }
}

// 최신 메시지가 보이도록 자동 스크롤
requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });

// ---- 입력창 ----
const inputBox = root.createDiv({ cls: "kchat-input" });
const ta = inputBox.createEl("textarea", {
    attr: { placeholder: "iMessage" }
});
const btn = inputBox.createEl("button", {
    text: "↑",
    attr: { "aria-label": "전송", "title": "전송 (Enter)" }
});
btn.disabled = true;

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

// 입력 줄 수에 따라 자동 높이 + 전송 버튼 활성/비활성
ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    btn.disabled = ta.value.trim().length === 0;
});
```
