// Wiki editor block renderers and editing behavior.

const WIKI_FS_SUPPORTED = typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";

/* ===========================================================
   ADDITIONAL WIKI BLOCK TYPES
   (ports of features from memo/wiki.js — list, checklist, code, math, table, image, attach, link)
   =========================================================== */

function ListBlock({ block, onUpdate }) {
  const items = block.items || [""];
  const isOrdered = block.type === "ol";
  const Tag = isOrdered ? "ol" : "ul";
  const focusItem = (index) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-list-block-id="${block.id}"][data-list-index="${index}"]`);
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  };
  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = _sanitizeRichHtml(val);
    onUpdate({ items: next });
  };
  const addItem = (afterIdx) => {
    onUpdate({ items: [...items.slice(0, afterIdx + 1), "", ...items.slice(afterIdx + 1)] });
    focusItem(afterIdx + 1);
  };
  const removeItem = (i) => onUpdate({ items: items.length > 1 ? items.filter((_, idx) => idx !== i) : items });
  return (
    <Tag style={{ paddingLeft: 22, margin: "8px 0", color: "var(--text-md)", lineHeight: 1.6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ margin: "3px 0" }}>
          <span
            data-list-block-id={block.id}
            data-list-index={i}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateItem(i, e.currentTarget.innerHTML)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addItem(i); }
              if (e.key === "Backspace" && e.currentTarget.textContent === "") { e.preventDefault(); removeItem(i); }
            }}
            style={{ outline: "none", display: "block", minHeight: 22 }}
            dangerouslySetInnerHTML={{ __html: _sanitizeRichHtml(item || "") }}
          />
        </li>
      ))}
    </Tag>
  );
}

function ChecklistBlock({ block, onUpdate }) {
  const items = (block.items || [{ text: "", checked: false }]).map((it) => ({ ...it, checked: !!(it.checked ?? it.done) }));
  const focusItem = (index) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-checklist-block-id="${block.id}"][data-checklist-index="${index}"]`);
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  };
  const update = (i, patch) => {
    const next = items.map((x, idx) => idx === i ? { ...x, ...patch } : x);
    onUpdate({ items: next });
    if (next.length > 0 && next.every(it => it.checked) && !(items[i].checked)) {
      window.Planary?.toast?.({ type: "ok", title: "모두 완료! 🎉", ttl: 2000 });
    }
  };
  const addItem = (afterIdx) => {
    onUpdate({ items: [...items.slice(0, afterIdx + 1), { text: "", checked: false }, ...items.slice(afterIdx + 1)] });
    focusItem(afterIdx + 1);
  };
  const removeItem = (i) => onUpdate({ items: items.length > 1 ? items.filter((_, idx) => idx !== i) : items });
  return (
    <div style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "start", gap: 8, padding: "4px 0" }}>
          <button
            type="button"
            className={`checkbox ${it.checked ? "is-checked" : ""}`}
            style={{ marginTop: 3, flexShrink: 0 }}
            onClick={() => update(i, { checked: !it.checked })}
          >
            {it.checked && <Icon name="check" size={11} stroke={3} />}
          </button>
          <span
            data-checklist-block-id={block.id}
            data-checklist-index={i}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => update(i, { text: _sanitizeRichHtml(e.currentTarget.innerHTML) })}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addItem(i); }
              if (e.key === "Backspace" && e.currentTarget.textContent === "") { e.preventDefault(); removeItem(i); }
            }}
            style={{
              outline: "none", flex: 1, minHeight: 22,
              color: it.checked ? "var(--text-lo)" : "var(--text-md)",
              textDecoration: it.checked ? "line-through" : "none",
              textDecorationColor: "var(--text-faint)",
            }}
            dangerouslySetInnerHTML={{ __html: _sanitizeRichHtml(it.text || "") }}
          />
        </div>
      ))}
    </div>
  );
}

function CodeEditorBlock({ block, onUpdate }) {
  const langs = ["javascript", "typescript", "tsx", "css", "html", "python", "java", "kotlin", "swift", "go", "rust", "sql", "shell", "json", "yaml", "markdown"];
  const lang = block.lang || "javascript";
  const code = block.code || "";
  const [copied, setCopied] = useStateO(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="codeblock" style={{ margin: "10px 0" }}>
      <div className="codeblock-bar">
        <select
          value={lang}
          onChange={(e) => onUpdate({ lang: e.target.value })}
          style={{ fontSize: 11, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "2px 6px", color: "var(--text-md)", fontFamily: "var(--font-mono)" }}
        >
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="codeblock-copy" onClick={handleCopy} type="button">
          <Icon name={copied ? "check" : "copy"} size={12} />{copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre style={{ margin: 0, border: 0, maxHeight: "60vh", overflowY: "auto" }}>
        <code
          contentEditable
          suppressContentEditableWarning
          spellCheck="false"
          onBlur={(e) => onUpdate({ code: e.currentTarget.textContent })}
          style={{
            display: "block", padding: "12px 14px",
            fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.55,
            color: "var(--text-md)", outline: "none", whiteSpace: "pre",
          }}
        >{code}</code>
      </pre>
    </div>
  );
}

function MathBlock({ block, onUpdate }) {
  const [tex, setTex] = useStateO(block.tex || "");
  const [edit, setEdit] = useStateO(!block.tex);
  // KaTeX is lazy-loaded on the first math block (see __ensureKatex in index.html).
  const [katexReady, setKatexReady] = useStateO(typeof window.katex !== "undefined");
  const renderedRef = useRefO(null);
  useEffectO(() => {
    if (edit) return;
    if (typeof window.katex === "undefined") {
      window.__ensureKatex?.().then(() => setKatexReady(true)).catch(() => {});
      return;
    }
    if (!renderedRef.current) return;
    try {
      window.katex.render(tex, renderedRef.current, { throwOnError: false, displayMode: true, strict: false });
    } catch (_) { renderedRef.current.textContent = tex; }
  }, [tex, edit, katexReady]);
  return (
    <div style={{ margin: "10px 0", padding: 16, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", textAlign: "center" }}>
      {edit ? (
        <textarea
          autoFocus
          value={tex}
          onChange={(e) => setTex(e.target.value)}
          onBlur={() => { onUpdate({ tex }); setEdit(false); }}
          placeholder={"\\sum_{i=1}^n i = \\frac{n(n+1)}{2}"}
          rows={2}
          style={{
            width: "100%",
            fontFamily: "var(--font-mono)", fontSize: 13,
            background: "var(--bg)", color: "var(--text-hi)",
            border: "1px solid var(--border)", borderRadius: 6,
            padding: 10, resize: "vertical", outline: "none",
          }}
        />
      ) : typeof window.katex === "undefined" ? (
        <div
          style={{ minHeight: 30, cursor: "pointer", padding: "6px 10px", background: "color-mix(in oklab, var(--warn) 8%, var(--surface))", border: "1px dashed color-mix(in oklab, var(--warn) 30%, var(--border))", borderRadius: 6, color: "var(--warn)", fontSize: 12, textAlign: "left" }}
          onClick={() => setEdit(true)}
        >
          <Icon name="sparkles" size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
          수식 라이브러리 불러오는 중… (클릭하면 소스 편집)
        </div>
      ) : (
        <div ref={renderedRef} style={{ minHeight: 30, cursor: "pointer", color: "var(--text-hi)", fontSize: 18 }} onClick={() => setEdit(true)} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 10, color: "var(--text-faint)" }}>
        <span>KaTeX · LaTeX</span>
        {!edit && <button type="button" className="btn btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={11} />수정</button>}
      </div>
    </div>
  );
}

// ---- Inline math ($…$) for contenteditable text blocks ----
// The stored block content always keeps the literal $…$ source. These helpers only
// decorate the live DOM: $…$ segments render via KaTeX while the block is not focused,
// and are restored to source on focus so they stay editable.
const _INLINE_MATH_RE = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/; // single $…$, never $$

function _renderInlineMathInto(el) {
  if (!el || typeof window.katex === "undefined") return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const targets = [];
  let n;
  while ((n = walker.nextNode())) {
    if (n.parentElement && n.parentElement.closest(".inline-math, code, pre")) continue;
    if (_INLINE_MATH_RE.test(n.nodeValue)) targets.push(n);
  }
  const re = new RegExp(_INLINE_MATH_RE.source, "g");
  for (const node of targets) {
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span");
      span.className = "inline-math";
      span.setAttribute("contenteditable", "false");
      span.dataset.tex = m[1];
      try { window.katex.render(m[1], span, { throwOnError: false, displayMode: false, strict: false }); }
      catch (_) { span.textContent = "$" + m[1] + "$"; }
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
}

function _stripInlineMathFrom(el) {
  if (!el) return;
  el.querySelectorAll(".inline-math").forEach((span) => {
    span.replaceWith(document.createTextNode("$" + (span.dataset.tex || "") + "$"));
  });
}

function TableBlock({ block, onUpdate }) {
  const rows = Array.isArray(block.rows) && block.rows.length
    ? block.rows.map((row) => Array.isArray(row) && row.length ? row : [""])
    : [["헤더 1", "헤더 2", "헤더 3"], ["", "", ""]];
  const focusCell = (r, c) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-table-block-id="${block.id}"][data-row="${r}"][data-col="${c}"]`);
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  };
  const updateCell = (r, c, val) => {
    const next = rows.map(row => [...row]);
    next[r][c] = val;
    onUpdate({ rows: next });
  };
  const addRow = (focusCol = 0) => {
    onUpdate({ rows: [...rows, Array(rows[0].length).fill("")] });
    focusCell(rows.length, focusCol);
  };
  const addCol = () => {
    onUpdate({ rows: rows.map(r => [...r, ""]) });
    focusCell(0, rows[0].length);
  };
  const deleteRow = (r) => {
    if (rows.length <= 2) return; // keep header + at least one data row
    onUpdate({ rows: rows.filter((_, i) => i !== r) });
  };
  const deleteCol = (c) => {
    if (rows[0].length <= 1) return;
    onUpdate({ rows: rows.map(row => row.filter((_, i) => i !== c)) });
  };
  return (
    <div style={{ margin: "10px 0", overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map((row, r) => (
            <tr key={`${r}-${row.length}`}>
              {row.map((cell, c) => {
                const isHeader = r === 0;
                const Tag = isHeader ? "th" : "td";
                return (
                  <Tag
                    key={`${r}-${c}`}
                    data-table-block-id={block.id}
                    data-row={r}
                    data-col={c}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCell(r, c, e.currentTarget.textContent)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addRow(c); }
                      if (e.key === "Tab") {
                        e.preventDefault();
                        if (c === row.length - 1 && r === rows.length - 1) {
                          addRow(c);
                        } else {
                          const nextRow = c === row.length - 1 ? r + 1 : r;
                          const nextCol = c === row.length - 1 ? 0 : c + 1;
                          focusCell(nextRow, nextCol);
                        }
                      }
                    }}
                    style={{
                      padding: "8px 10px",
                      border: "1px solid var(--border-soft)",
                      background: isHeader ? "var(--bg-elev)" : "transparent",
                      fontWeight: isHeader ? 700 : 500,
                      color: isHeader ? "var(--text-hi)" : "var(--text-md)",
                      textAlign: "left", outline: "none",
                      minWidth: 80,
                    }}
                  >{cell}</Tag>
                );
              })}
              {r > 0 && rows.length > 2 && (
                <td style={{ padding: "4px 4px", border: "1px solid var(--border-soft)", background: "var(--surface-2)", width: 28 }}>
                  <button type="button" className="btn btn-xs wiki-table-del-row" title="행 삭제" onClick={() => deleteRow(r)}>
                    <Icon name="x" size={10} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 6, padding: 6, borderTop: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
        <button type="button" className="btn btn-sm" onClick={() => addRow()}><Icon name="plus" size={11} />행 추가</button>
        <button type="button" className="btn btn-sm" onClick={addCol}><Icon name="plus" size={11} />열 추가</button>
        {rows[0].length > 1 && (
          <button type="button" className="btn btn-sm" style={{ color: "var(--err)", marginLeft: "auto" }} onClick={() => deleteCol(rows[0].length - 1)}>
            <Icon name="x" size={11} />마지막 열 삭제
          </button>
        )}
      </div>
    </div>
  );
}

function ImageBlock({ block, onUpdate }) {
  const fileRef = useRefO(null);
  const [caption, setCaption] = useStateO(block.caption || "");
  const [loading, setLoading] = useStateO(false);
  const [imgError, setImgError] = useStateO(false);
  const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type)) {
      window.Planary?.toast?.({ type: "err", title: "지원하지 않는 형식이에요", sub: "PNG, JPG, WebP, GIF만 올릴 수 있어요" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.Planary?.toast?.({ type: "err", title: "파일이 너무 커요", sub: "5MB 이하 이미지를 선택해 주세요" });
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = () => { onUpdate({ url: reader.result, name: file.name }); setLoading(false); };
    reader.onerror = () => { window.Planary?.toast?.({ type: "err", title: "이미지를 불러올 수 없어요" }); setLoading(false); };
    reader.readAsDataURL(file);
  };
  const handleUrl = () => {
    const u = window.prompt("이미지 URL을 입력하세요");
    if (u) onUpdate({ url: u, name: u.split("/").pop() });
  };
  if (!block.url) {
    return (
      <div style={{ margin: "10px 0", padding: 24, border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elev)", textAlign: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <Icon name="image" size={28} style={{ color: "var(--text-faint)", marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: "var(--text-md)", fontWeight: 600 }}>이미지를 추가하세요</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 4 }}>PNG · JPG · WebP · GIF · 최대 5MB</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
          <button type="button" className="btn btn-sm" disabled={loading} onClick={() => fileRef.current?.click()}>
            {loading ? <span style={{ display: "inline-block", width: 11, height: 11, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Icon name="image" size={11} />}
            {loading ? "변환 중…" : "업로드"}
          </button>
          <button type="button" className="btn btn-sm" disabled={loading} onClick={handleUrl}><Icon name="link" size={11} />URL</button>
        </div>
      </div>
    );
  }
  return (
    <figure style={{ margin: "10px 0", padding: 0 }}>
      {imgError ? (
        <div style={{ padding: "20px 16px", border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "color-mix(in oklab, var(--err) 6%, var(--surface))", textAlign: "center", color: "var(--err)", fontSize: 12 }}>
          <Icon name="image" size={20} style={{ marginBottom: 6, opacity: 0.5 }} />
          <div>이미지를 불러올 수 없어요</div>
          <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 4 }}>{block.url?.slice(0, 60)}</div>
        </div>
      ) : (
        <img src={block.url} alt={block.name || ""} onError={() => setImgError(true)} style={{ maxWidth: "100%", borderRadius: "var(--r-md)", border: "1px solid var(--border-soft)", display: "block" }} />
      )}
      <figcaption
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ caption: e.currentTarget.textContent })}
        style={{ fontSize: 11, color: "var(--text-lo)", textAlign: "center", marginTop: 6, outline: "none", fontStyle: "italic" }}
        data-placeholder="캡션 추가"
      >{caption || ""}</figcaption>
    </figure>
  );
}

function AttachBlock({ block, onUpdate }) {
  const fileRef = useRefO(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdate({ name: file.name, size: file.size });
  };
  if (!block.name) {
    return (
      <div style={{ margin: "10px 0", padding: 14, border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elev)", display: "flex", alignItems: "center", gap: 12 }}>
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFile} />
        <Icon name="paperclip" size={18} style={{ color: "var(--text-lo)", flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, color: "var(--text-lo)" }}>파일 첨부</div>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()}>
          <Icon name="paperclip" size={11} />선택
        </button>
      </div>
    );
  }
  const sizeKB = block.size ? Math.round(block.size / 1024) : 0;
  return (
    <div style={{ margin: "10px 0", padding: 12, border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="paperclip" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{block.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{sizeKB > 0 ? `${sizeKB.toLocaleString()} KB` : "—"}</div>
      </div>
      <button type="button" className="btn btn-sm"><Icon name="download" size={11} />다운로드</button>
    </div>
  );
}

function BookmarkBlock({ block, onUpdate }) {
  const [editing, setEditing] = useStateO(!block.url);
  const [urlDraft, setUrlDraft] = useStateO(block.url || "");
  if (editing) {
    return (
      <div style={{ margin: "10px 0", padding: 14, border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elev)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="link" size={16} style={{ color: "var(--text-lo)", flexShrink: 0 }} />
          <input
            autoFocus
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUpdate({ url: urlDraft, title: urlDraft.replace(/^https?:\/\//, "").split("/")[0] });
                setEditing(false);
              }
            }}
            placeholder="URL을 붙여넣고 Enter"
            className="form-input"
            style={{ flex: 1, fontFamily: "var(--font-mono)" }}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => { onUpdate({ url: urlDraft, title: urlDraft.replace(/^https?:\/\//, "").split("/")[0] }); setEditing(false); }}
            disabled={!urlDraft.trim()}
          >
            가져오기
          </button>
        </div>
      </div>
    );
  }
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { if (e.target.closest(".bookmark-edit-btn")) e.preventDefault(); }}
      style={{
        margin: "10px 0", padding: 14,
        display: "flex", gap: 14,
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        color: "inherit", textDecoration: "none",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="globe" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{block.title || block.url}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{block.url}</div>
      </div>
      <button
        type="button"
        className="btn btn-sm bookmark-edit-btn"
        onClick={(e) => { e.preventDefault(); setEditing(true); }}
        style={{ alignSelf: "start" }}
      >
        <Icon name="edit" size={11} />
      </button>
    </a>
  );
}


/* ===========================================================
   WIKI BLOCKS — editable + drag-reorderable
   =========================================================== */
const INITIAL_BLOCKS_BY_PAGE = {
};

function WikiFormatToolbar({ containerRef }) {
  const [pos, setPos] = React.useState(null);
  const [active, setActive] = React.useState({});
  React.useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setPos(null); return; }
      if (!containerRef.current) return;
      const range = sel.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) { setPos(null); return; }
      const rect = range.getBoundingClientRect();
      if (!rect.width) { setPos(null); return; }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top;
      setPos({
        x: Math.max(110, Math.min(window.innerWidth - 110, cx)),
        y: cy,
      });
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikeThrough"),
      });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [containerRef]);
  if (!pos) return null;
  const fmt = (cmd) => {
    if (cmd === "code") {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const fragment = range.extractContents();
        const code = document.createElement("code");
        code.appendChild(fragment);
        range.insertNode(code);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(code);
        sel.addRange(newRange);
      }
    } else {
      document.execCommand(cmd, false, null);
    }
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikeThrough"),
    });
  };
  return (
    <div
      className="wiki-format-toolbar"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button className={"wiki-fmt-btn " + (active.bold ? "is-active" : "")} onClick={() => fmt("bold")} title="굵게 (Ctrl+B)"><b>B</b></button>
      <button className={"wiki-fmt-btn " + (active.italic ? "is-active" : "")} onClick={() => fmt("italic")} title="기울임 (Ctrl+I)"><i>I</i></button>
      <button className={"wiki-fmt-btn " + (active.underline ? "is-active" : "")} onClick={() => fmt("underline")} title="밑줄 (Ctrl+U)"><u>U</u></button>
      <button className={"wiki-fmt-btn " + (active.strikethrough ? "is-active" : "")} onClick={() => fmt("strikeThrough")} title="취소선"><s>S</s></button>
      <div className="wiki-fmt-sep" />
      <button className="wiki-fmt-btn" onClick={() => fmt("code")} title="코드">{"`"}</button>
    </div>
  );
}
function WikiBlocks({ activeId, onBlocksChange }) {
  const [blocks, setBlocks] = useStateO(() => INITIAL_BLOCKS_BY_PAGE[activeId] || [
    { id: "b1", type: "p", content: "" }
  ]);
  const [activeBlockId, setActiveBlockId] = useStateO(null);
  const [focusBlockId, setFocusBlockId] = useStateO(null);
  const [dragId, setDragId] = useStateO(null);
  const [dropId, setDropId] = useStateO(null);
  const [dropPos, setDropPos] = useStateO("after"); // before | after
  const [menuOpenId, setMenuOpenId] = useStateO(null);
  const [slashMenu, setSlashMenu] = useStateO(null); // { blockId, x, y } | null
  const containerRef = React.useRef(null);
  const lastSavedRef = useRefO("");
  const liveBlocksRef = useRefO(blocks);
  const liveSaveTimerRef = useRefO(null);
  const undoStackRef = useRefO([]);
  const isRestoringRef = useRefO(false);

  // Re-load blocks when switching pages — prefer live WIKI_PAGES from firebase-bridge
  useEffectO(() => {
    const live = window.Planary.WIKI_PAGES && window.Planary.WIKI_PAGES[activeId];
    const initial = (live && Array.isArray(live.blocks) && live.blocks.length)
      ? live.blocks
      : (INITIAL_BLOCKS_BY_PAGE[activeId] || [{ id: `b${Date.now()}`, type: "p", content: "" }]);
    setBlocks(initial);
    setActiveBlockId(null);
    setSlashMenu(null);
    // Mark this load as "remote" so the save-effect below skips it
    lastSavedRef.current = JSON.stringify(initial);
    liveBlocksRef.current = initial;
    undoStackRef.current = [initial];
    return () => {
      // Force-save any pending unsaved typing before switching to another page
      clearTimeout(liveSaveTimerRef.current);
      const data = liveBlocksRef.current;
      const serialized = JSON.stringify(data);
      if (activeId && serialized !== lastSavedRef.current) {
        lastSavedRef.current = serialized;
        window.dispatchEvent(new CustomEvent("planary:save-wiki-blocks", {
          detail: { id: activeId, blocks: data },
        }));
      }
    };
  }, [activeId]);

  // Refresh blocks when the bridge emits fresh wiki data for the current page
  useEffectO(() => {
    const onLoaded = (e) => {
      const d = e.detail || {};
      const live = d.byId && d.byId[activeId];
      if (live && Array.isArray(live.blocks)) {
        const serialized = JSON.stringify(live.blocks);
        if (serialized !== lastSavedRef.current) {
          // Skip if the user has already typed something beyond what was initially loaded —
          // overwriting their edits with stale Firestore data would cause data loss.
          const userHasEdited = JSON.stringify(liveBlocksRef.current) !== lastSavedRef.current;
          if (!userHasEdited) {
            setBlocks(live.blocks);
            liveBlocksRef.current = live.blocks;
            lastSavedRef.current = serialized;
          }
        }
      }
    };
    window.addEventListener("planary:wiki-loaded", onLoaded);
    return () => window.removeEventListener("planary:wiki-loaded", onLoaded);
  }, [activeId]);

  // Apply restored blocks from VersionHistoryDialog
  useEffectO(() => {
    const onRestore = (e) => {
      const d = e.detail || {};
      if (d.id !== activeId || !Array.isArray(d.blocks)) return;
      setBlocks(d.blocks);
      liveBlocksRef.current = d.blocks;
      lastSavedRef.current = JSON.stringify(d.blocks);
      undoStackRef.current = [d.blocks];
    };
    window.addEventListener("planary:wiki-restore", onRestore);
    return () => window.removeEventListener("planary:wiki-restore", onRestore);
  }, [activeId]);

  // Notify parent of block changes (for TOC etc.)
  useEffectO(() => {
    onBlocksChange && onBlocksChange(blocks);
  }, [blocks]);

  // Keep a live ref of the latest blocks for ref-based reads (Ctrl+S, autosave from input).
  useEffectO(() => {
    liveBlocksRef.current = blocks;
    if (!isRestoringRef.current) {
      const last = undoStackRef.current[undoStackRef.current.length - 1];
      const serialized = JSON.stringify(blocks);
      if (!last || JSON.stringify(last) !== serialized) {
        undoStackRef.current.push(blocks);
        if (undoStackRef.current.length > 80) undoStackRef.current.shift();
      }
    }
  }, [blocks]);

  const flushSave = (sourceBlocks) => {
    if (!activeId) return;
    const data = sourceBlocks || liveBlocksRef.current;
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    window.dispatchEvent(new CustomEvent("planary:save-wiki-blocks", {
      detail: { id: activeId, blocks: data },
    }));
  };

  const scheduleAutoSave = () => {
    clearTimeout(liveSaveTimerRef.current);
    liveSaveTimerRef.current = setTimeout(() => flushSave(), 800);
  };

  // Debounced auto-save to Firestore when blocks state changes (structural ops, blur commits).
  useEffectO(() => {
    if (!activeId) return;
    const serialized = JSON.stringify(blocks);
    if (serialized === lastSavedRef.current) return;
    const t = setTimeout(() => flushSave(blocks), 800);
    return () => clearTimeout(t);
  }, [blocks, activeId]);

  // Live edit from contenteditable onInput — updates the live ref without
  // triggering re-render (avoids caret jump), and schedules autosave.
  const onLiveEdit = (blockId, key, value) => {
    liveBlocksRef.current = liveBlocksRef.current.map(b =>
      b.id === blockId ? { ...b, [key]: value } : b
    );
    scheduleAutoSave();
  };

  // Ctrl+S to force save now, Ctrl+Z to undo, Delete to remove a selected block.
  useEffectO(() => {
    const onKey = (e) => {
      if (e.isComposing) return;
      const active = document.activeElement;
      const inWiki = active && (active.isContentEditable || active.closest?.(".wiki-block"));
      const isEditableTarget = active && (
        active.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)
      );

      if ((e.key === "Delete" || e.key === "Backspace") && activeBlockId && inWiki && !isEditableTarget) {
        e.preventDefault();
        e.stopPropagation();
        setBlocks(prev => {
          const idx = prev.findIndex(b => b.id === activeBlockId);
          if (idx < 0) return prev;
          const next = prev.filter(b => b.id !== activeBlockId);
          const fallback = next[Math.max(0, idx - 1)] || next[0] || null;
          setActiveBlockId(fallback ? fallback.id : null);
          return next.length ? next : [{ id: `b${Date.now()}`, type: "p", content: "" }];
        });
        scheduleAutoSave();
        return;
      }

      if (!(e.ctrlKey || e.metaKey)) return;
      const k = (e.key || "").toLowerCase();
      if (k === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (active && active.isContentEditable) {
          const editable = active;
          // Find which block this belongs to by walking up to nearest [data-block-id]
          const blockEl = editable.closest && editable.closest("[data-block-id]");
          if (blockEl) {
            onLiveEdit(blockEl.dataset.blockId, "content", editable.innerHTML);
          }
        }
        clearTimeout(liveSaveTimerRef.current);
        // Sync React state with live ref so blur won't overwrite, and snapshot for undo.
        setBlocks(liveBlocksRef.current);
        flushSave();
        window.Planary?.toast?.({ type: "ok", title: "저장됨", ttl: 1200 });
        return;
      }
      if (k === "z" && !e.shiftKey) {
        if (!inWiki) return;
        if (undoStackRef.current.length < 2) return;
        e.preventDefault();
        e.stopPropagation();
        // If user typed since last commit, push current live state so undo lands on prior commit.
        const liveSerialized = JSON.stringify(liveBlocksRef.current);
        const topSerialized = JSON.stringify(undoStackRef.current[undoStackRef.current.length - 1]);
        if (liveSerialized !== topSerialized) {
          undoStackRef.current.push(liveBlocksRef.current);
        }
        undoStackRef.current.pop();
        const prev = undoStackRef.current[undoStackRef.current.length - 1];
        isRestoringRef.current = true;
        setBlocks(prev);
        liveBlocksRef.current = prev;
        scheduleAutoSave();
        setTimeout(() => { isRestoringRef.current = false; }, 0);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activeId, activeBlockId]);

  const updateBlock = (id, patch) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const defaultsForType = (type, content = "") => {
    if (type === "ul" || type === "ol") return { type, items: [content] };
    if (type === "todo") return { type, items: [{ text: content, checked: false }] };
    if (type === "table") return { type, rows: [["헤더 1", "헤더 2", "헤더 3"], ["", "", ""]] };
    if (type === "callout") return { type, variant: "ok", title: "포인트", body: content };
    return { type, content };
  };

  const addBlockAfter = (afterId, type = "p", { focus = true } = {}) => {
    const newId = `b${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    const newBlock = { id: newId, ...defaultsForType(type, "") };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId);
      if (idx < 0) return [...prev, newBlock];
      return [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)];
    });
    setActiveBlockId(newId);
    if (focus) setFocusBlockId(newId);
    return newId;
  };

  const removeBlock = (id) =>
    setBlocks(prev => prev.filter(b => b.id !== id));

  const moveBlock = (id, dir) =>
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });

  const duplicateBlock = (id) =>
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const orig = prev[idx];
      const copy = { ...orig, id: `b${Date.now()}${Math.random().toString(36).slice(2, 5)}` };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });

  const openSlashMenu = (blockId, rect) => {
    setSlashMenu({ blockId, x: rect.left, y: rect.bottom + 6 });
  };

  // Drag handlers
  const onDragStart = (e, id) => {
    setActiveBlockId(id);
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch (_) {}
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    if (id === dragId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientY - rect.top) < rect.height / 2 ? "before" : "after";
    setDropId(id);
    setDropPos(pos);
  };
  const onDragEnd = () => { setDragId(null); setDropId(null); };
  const onDrop = (e, id) => {
    e.preventDefault();
    if (!dragId || dragId === id) { onDragEnd(); return; }
    setBlocks(prev => {
      const src = prev.find(b => b.id === dragId);
      if (!src) return prev;
      const remaining = prev.filter(b => b.id !== dragId);
      const targetIdx = remaining.findIndex(b => b.id === id);
      if (targetIdx < 0) return prev;
      const insertAt = dropPos === "before" ? targetIdx : targetIdx + 1;
      return [...remaining.slice(0, insertAt), src, ...remaining.slice(insertAt)];
    });
    onDragEnd();
  };

  const addAtEnd = () => {
    const lastId = blocks[blocks.length - 1]?.id;
    addBlockAfter(lastId, "p");
  };

  return (
    <div className="wiki-block" onClick={() => setMenuOpenId(null)} ref={containerRef}>
      {blocks.map((b, i) => (
        <WikiBlockItem
          key={b.id}
          block={b}
          isActive={activeBlockId === b.id}
          autoFocus={focusBlockId === b.id}
          onAutoFocused={() => setFocusBlockId(null)}
          isDragging={dragId === b.id}
          dropIndicator={dropId === b.id ? dropPos : null}
          isMenuOpen={menuOpenId === b.id}
          onActivate={() => setActiveBlockId(b.id)}
          onUpdate={(patch) => updateBlock(b.id, patch)}
          onAddAfter={(type) => addBlockAfter(b.id, type)}
          onDuplicate={() => duplicateBlock(b.id)}
          onMoveUp={() => moveBlock(b.id, -1)}
          onMoveDown={() => moveBlock(b.id, 1)}
          isFirst={i === 0}
          isLast={i === blocks.length - 1}
          onRemove={() => {
            removeBlock(b.id);
            // focus previous block on remove
            if (i > 0) setFocusBlockId(blocks[i - 1].id);
          }}
          onMenuToggle={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
          onMenuClose={() => setMenuOpenId(null)}
          onLiveEdit={(key, value) => onLiveEdit(b.id, key, value)}
          onSlashCommand={(rect) => openSlashMenu(b.id, rect)}
          onDragStart={(e) => onDragStart(e, b.id)}
          onDragOver={(e) => onDragOver(e, b.id)}
          onDrop={(e) => onDrop(e, b.id)}
          onDragEnd={onDragEnd}
        />
      ))}

      {/* Notion-style trailing affordance — click to add a focused block */}
      <div
        className="wiki-block-trail"
        onClick={addAtEnd}
        title="클릭해서 추가 · /로 명령 메뉴"
      >
        <span className="wiki-block-trail-hint">
          <Icon name="plus" size={11} />
          <span>이어서 입력하거나 <kbd className="kbd">/</kbd>로 명령 메뉴 열기</span>
        </span>
      </div>

      <WikiFormatToolbar containerRef={containerRef} />
      {slashMenu && (
        <SlashCommandMenu
          slashMenu={slashMenu}
          onClose={() => setSlashMenu(null)}
          onPick={(type) => {
            const cur = liveBlocksRef.current?.find(b => b.id === slashMenu.blockId);
            const content = cur ? (cur.content || "").replace(/\/\s*$/, "").trimEnd() : "";
            updateBlock(slashMenu.blockId, defaultsForType(type, content));
            setFocusBlockId(slashMenu.blockId);
            setSlashMenu(null);
          }}
        />
      )}
    </div>
  );
}

function _sanitizeRichHtml(html) {
  if (!html || !html.includes('<')) return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const DANGEROUS = new Set(['script','iframe','object','embed','form','input','button','select','textarea','style','link','meta','base','noscript']);
  (function walk(node) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child.nodeType !== 1) continue;
      if (DANGEROUS.has(child.tagName.toLowerCase())) { node.removeChild(child); continue; }
      for (const attr of [...child.attributes]) {
        const n = attr.name.toLowerCase();
        if (n.startsWith('on') || (/^(href|src|action)$/.test(n) && /^\s*javascript:/i.test(attr.value)))
          child.removeAttribute(attr.name);
      }
      walk(child);
    }
  })(tmp);
  return tmp.innerHTML;
}

function WikiBlockItem({ block, isActive, autoFocus, onAutoFocused, isDragging, dropIndicator, isMenuOpen, onActivate, onUpdate, onAddAfter, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast, onRemove, onMenuToggle, onMenuClose, onLiveEdit, onSlashCommand, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const ref = useRefO(null);
  const bodyRef = useRefO(null);

  const commitContent = (key, val) => onUpdate({ [key]: typeof val === 'string' ? _sanitizeRichHtml(val) : val });
  const defaultsForType = (type, content = "") => {
    if (type === "ul" || type === "ol") return { type, items: [content] };
    if (type === "todo") return { type, items: [{ text: content, checked: false }] };
    if (type === "table") return { type, rows: [["헤더 1", "헤더 2", "헤더 3"], ["", "", ""]] };
    if (type === "callout") return { type, variant: "ok", title: "포인트", body: content };
    return { type, content };
  };
  const handleInput = (e) => onLiveEdit && onLiveEdit("content", e.currentTarget.innerHTML);

  // Inline math: show editable $…$ source while focused; render via KaTeX on blur.
  const handleTextFocus = () => _stripInlineMathFrom(ref.current);
  const handleTextBlur = (e) => {
    const el = e.currentTarget;
    commitContent("content", el.innerHTML);
    // Render immediately; if the commit re-render rewrites innerHTML back to the raw
    // source, the [block.content] effect below re-applies the decoration after it.
    _renderInlineMathInto(el);
  };
  // Decorate $…$ on mount / content change while the block is not being edited.
  useEffectO(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    _stripInlineMathFrom(el);
    _renderInlineMathInto(el);
  }, [block.content, block.type]);

  useEffectO(() => {
    if (!autoFocus || !bodyRef.current) return;
    const editable = bodyRef.current.querySelector("[contenteditable]");
    if (editable) {
      editable.focus();
      // Move caret to end
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    onAutoFocused && onAutoFocused();
  }, [autoFocus]);

  // Handle keyboard:
  // - "/" opens slash menu (works anywhere — like Notion)
  // - Enter creates a new block (instead of newline)
  // - Backspace at empty content removes block and focuses previous
  // Markdown shorthand: when Space is pressed and the line so far matches
  // a markdown prefix (e.g. "#", ">", "$$"), convert the block type.
  const MD_PREFIX_MAP = {
    "#": "h1",
    "##": "h2",
    "###": "h3",
    ">": "quote",
    "$$": "math",
    "-": "ul",
    "*": "ul",
    "1.": "ol",
    "[]": "todo",
  };

  const tryMarkdownShortcut = (e) => {
    if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
    const text = (e.currentTarget.textContent || "").trimEnd();
    const nextType = MD_PREFIX_MAP[text];
    if (!nextType) return false;
    // Only convert from a plain text block — avoid re-converting an already-h1 etc.
    if (block.type !== "p" && block.type !== "h1" && block.type !== "h2" && block.type !== "h3" && block.type !== "quote") return false;
    e.preventDefault();
    // Clear the visible prefix immediately so the caret resets.
    e.currentTarget.innerHTML = "";
    onUpdate(defaultsForType(nextType, ""));
    window.setTimeout(() => {
      const nextEditable = document.querySelector(`.wiki-block-row[data-block-id="${block.id}"] [contenteditable]`);
      if (!nextEditable) return;
      nextEditable.focus();
      const range = document.createRange();
      range.selectNodeContents(nextEditable);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
    return true;
  };

  const handleKeyDown = (e) => {
    if (tryMarkdownShortcut(e)) return;
    if (e.key === "/") {
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      // Position menu just below the current block
      onSlashCommand && onSlashCommand(rect);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAddAfter && onAddAfter("p");
      return;
    }
    if (e.key === "Backspace" && e.target.textContent === "") {
      e.preventDefault();
      onRemove && onRemove();
      return;
    }
  };

  const renderContent = () => {
    const t = block.type;
    const safeContent = _sanitizeRichHtml(block.content || '');
    if (t === "h1") return <h1 ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onFocus={handleTextFocus} onBlur={handleTextBlur} style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", margin: "16px 0 6px" }} dangerouslySetInnerHTML={{ __html: safeContent }} />;
    if (t === "h2") return <h2 ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onFocus={handleTextFocus} onBlur={handleTextBlur} dangerouslySetInnerHTML={{ __html: safeContent }} />;
    if (t === "h3") return <h3 ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onFocus={handleTextFocus} onBlur={handleTextBlur} dangerouslySetInnerHTML={{ __html: safeContent }} />;
    if (t === "p") return <p ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onFocus={handleTextFocus} onBlur={handleTextBlur} dangerouslySetInnerHTML={{ __html: safeContent }} />;
    if (t === "quote") return <blockquote ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onFocus={handleTextFocus} onBlur={handleTextBlur} dangerouslySetInnerHTML={{ __html: safeContent }} />;
    if (t === "ul" || t === "ol") {
      return <ListBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "todo") {
      return <ChecklistBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "code") {
      return <CodeEditorBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "math") {
      return <MathBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "table") {
      return <TableBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "image") {
      return <ImageBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "attach") {
      return <AttachBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "link") {
      return <BookmarkBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "callout") {
      return (
        <div className={`callout callout-${block.variant || "ok"}`}>
          <Icon name={block.variant === "warn" ? "flag" : block.variant === "err" ? "x" : "sparkles"} size={18} style={{ color: block.variant === "warn" ? "var(--warn)" : block.variant === "err" ? "var(--err)" : "var(--ok)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong
              contentEditable suppressContentEditableWarning
              onBlur={e => commitContent("title", e.currentTarget.textContent)}
              style={{ color: "var(--text-hi)" }}
              dangerouslySetInnerHTML={{ __html: _sanitizeRichHtml(block.title || "") }}
            />{" "}
            <span
              contentEditable suppressContentEditableWarning
              onBlur={e => commitContent("body", e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: _sanitizeRichHtml(block.body || "") }}
            />
          </div>
        </div>
      );
    }
    if (t === "divider") return <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />;
    return <p ref={ref} contentEditable dangerouslySetInnerHTML={{ __html: safeContent }} />;
  };

  return (
    <div
      className={`wiki-block-row ${isActive ? "is-active" : ""} ${isDragging ? "is-dragging" : ""} ${dropIndicator ? `drop-${dropIndicator}` : ""}`}
      data-block-id={block.id}
      data-block-type={block.type}
      draggable
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        onActivate();
      }}
      onFocus={onActivate}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {(block.type === "h1" || block.type === "h2" || block.type === "h3") && (
        <span className="wiki-block-type-badge">{block.type.toUpperCase()}</span>
      )}
      <div className="wiki-block-handles">
        <button
          className="wiki-block-add-btn"
          onClick={(e) => { e.stopPropagation(); onAddAfter("p"); }}
          title="아래에 블록 추가"
          aria-label="블록 추가"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button
          className="wiki-block-handle"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          title="드래그해서 이동 · 클릭해서 메뉴"
          aria-label="블록 이동 / 메뉴"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="6" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
        {isMenuOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 79 }}
              onClick={(e) => { e.stopPropagation(); onMenuClose(); }}
            />
            <div className="wiki-block-menu" onClick={(e) => e.stopPropagation()}>
            <div className="kicker" style={{ padding: "6px 10px 4px" }}>전환</div>
            {[
              { type: "p",       label: "본문",        icon: "edit" },
              { type: "h1",      label: "헤딩 1",      icon: "hash" },
              { type: "h2",      label: "헤딩 2",      icon: "hash" },
              { type: "h3",      label: "헤딩 3",      icon: "hash" },
              { type: "ul",      label: "글머리 기호",   icon: "list" },
              { type: "ol",      label: "번호 매기기",   icon: "list" },
              { type: "todo",    label: "체크리스트",    icon: "check" },
              { type: "quote",   label: "인용",        icon: "edit" },
              { type: "callout", label: "콜아웃",       icon: "sparkles" },
              { type: "code",    label: "코드 블록",    icon: "command" },
              { type: "math",    label: "수식",         icon: "hash" },
              { type: "table",   label: "표",           icon: "grid" },
              { type: "image",   label: "이미지",       icon: "image" },
              { type: "attach",  label: "파일 첨부",     icon: "paperclip" },
              { type: "link",    label: "북마크",        icon: "link" },
              { type: "divider", label: "구분선",       icon: "list" },
            ].map(o => (
              <button
                key={o.type}
                className={`popover-item ${block.type === o.type ? "is-active" : ""}`}
                onClick={() => { onUpdate(defaultsForType(o.type, block.content || "")); onMenuClose(); }}
                style={block.type === o.type ? { color: "var(--accent)", background: "var(--accent-softer)" } : undefined}
              >
                <Icon name={o.icon} size={13} />{o.label}
              </button>
            ))}
            <div className="popover-sep" />
            <button className="popover-item" onClick={() => { onAddAfter("p"); onMenuClose(); }}>
              <Icon name="plus" size={13} />아래 블록 추가
            </button>
            <button className="popover-item" onClick={() => { onDuplicate(); onMenuClose(); }}>
              <Icon name="copy" size={13} />복제
            </button>
            <div className="popover-sep" />
            <button className="popover-item" onClick={() => { onMoveUp(); onMenuClose(); }} disabled={isFirst} style={isFirst ? { opacity: 0.4 } : undefined}>
              <Icon name="arrowUp" size={13} />위로 이동
            </button>
            <button className="popover-item" onClick={() => { onMoveDown(); onMenuClose(); }} disabled={isLast} style={isLast ? { opacity: 0.4 } : undefined}>
              <Icon name="arrowDown" size={13} />아래로 이동
            </button>
            <div className="popover-sep" />
            <button className="popover-item is-danger" onClick={() => { onRemove(); onMenuClose(); }}>
              <Icon name="trash" size={13} />삭제
            </button>
            </div>
          </>
        )}
      </div>
      <div className="wiki-block-body" ref={bodyRef}>
        {renderContent()}
      </div>
    </div>
  );
}

