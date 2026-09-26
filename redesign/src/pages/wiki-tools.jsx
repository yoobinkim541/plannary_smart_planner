/* Wiki support UI and import/export utilities use shared hooks from pages-rest.jsx. */
/* ===========================================================
   VERSION HISTORY DIALOG — wiki page revisions with restore
   =========================================================== */
function VersionHistoryDialog({ onClose, page, onRestore }) {
  const [versions, setVersions] = useStateO(null); // null = loading
  const [selectedIdx, setSelectedIdx] = useStateO(0);
  const [restoring, setRestoring] = useStateO(false);

  // Load revisions from Firestore on open
  useEffectO(() => {
    let cancelled = false;
    window.Planary.api.loadWikiRevisions(page.id).then(revs => {
      if (!cancelled) setVersions(revs);
    }).catch(err => {
      console.error("[Planary] loadWikiRevisions failed:", err);
      if (!cancelled) setVersions([]);
    });
    return () => { cancelled = true; };
  }, [page.id]);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selected = versions && versions.length ? versions[selectedIdx] : null;

  const formatAgo = (ms) => {
    if (!ms) return "알 수 없음";
    const diff = Date.now() - ms;
    if (diff < 60000)  return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 172800000) return "어제";
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;
    return new Date(ms).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const restore = async () => {
    if (!selected || selectedIdx === 0) return;
    if (!window.confirm(`이 버전으로 되돌릴까요? 현재 내용은 새 버전으로 보존됩니다.`)) return;
    setRestoring(true);
    try {
      // Dispatch as if the user saved these blocks (auto-saves + creates new revision)
      window.dispatchEvent(new CustomEvent("planary:save-wiki-blocks", {
        detail: { id: page.id, blocks: selected.blocks },
      }));
      if (onRestore) onRestore(selected.blocks);
      window.Planary.toast({
        type: "ok",
        title: "이전 버전으로 되돌렸어요",
        sub: `${formatAgo(selected.savedAt)} · ${selected.authorName}`,
      });
      onClose();
    } catch (err) {
      console.error("[Planary] restore failed:", err);
      window.Planary.toast({ type: "err", title: "되돌리기 실패", sub: String(err.message) });
    } finally {
      setRestoring(false);
    }
  };

  const renderBlockPreview = (blocks) => {
    if (!blocks || !blocks.length) return <div style={{ fontSize: 12, color: "var(--text-faint)" }}>내용 없음</div>;
    return blocks.slice(0, 8).map((b, i) => {
      const text = b.content || "";
      if (b.type === "h1") return <h2 key={i} style={{ fontSize: 17, fontWeight: 700, color: "var(--text-hi)", margin: "10px 0 6px" }}>{text}</h2>;
      if (b.type === "h2") return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", margin: "8px 0 4px" }}>{text}</h3>;
      if (b.type === "h3") return <h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", margin: "6px 0 4px" }}>{text}</h3>;
      if (b.type === "code") return <pre key={i} className="mono" style={{ fontSize: 11.5, padding: 10, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-sm)", margin: "6px 0", overflowX: "auto" }}>{text}</pre>;
      if (b.type === "callout") return <div key={i} className="callout callout-ok" style={{ fontSize: 13 }}><Icon name="sparkles" size={16} style={{ color: "var(--ok)", flexShrink: 0, marginTop: 2 }} />{text}</div>;
      if (b.type === "divider") return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border-soft)", margin: "8px 0" }} />;
      return <p key={i} style={{ fontSize: 13, color: "var(--text-md)", lineHeight: 1.6, margin: "4px 0" }}>{text}</p>;
    });
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(820px, 96vw)", maxHeight: "82vh", padding: 0, display: "flex", flexDirection: "column" }}>
        <div className="dialog-head" style={{ flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="clock" size={16} style={{ color: "var(--accent)" }} />
              수정 이력
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
              <span style={{ color: "var(--text-md)", fontWeight: 600 }}>{page.title}</span>
              {versions !== null && ` · ${versions.length}개 버전`}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {versions === null ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
            <div style={{ fontSize: 13, color: "var(--text-faint)" }}>불러오는 중...</div>
          </div>
        ) : versions.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 8 }}>
            <Icon name="clock" size={28} style={{ color: "var(--text-faint)" }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>아직 저장된 이력이 없어요</div>
            <div style={{ fontSize: 12, color: "var(--text-lo)" }}>문서를 편집하면 자동으로 이력이 쌓입니다</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
            {/* Left: version list */}
            <div style={{ borderRight: "1px solid var(--border-soft)", overflowY: "auto", padding: "10px 8px" }}>
              <div className="version-thread">
                {versions.map((v, i) => {
                  const active = i === selectedIdx;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`version-item ${active ? "is-active" : ""} ${i === 0 ? "is-current" : ""}`}
                      onClick={() => setSelectedIdx(i)}
                    >
                      <span className="version-dot" />
                      <div className="version-meta">
                        <div className="version-row">
                          <span className="version-time">{formatAgo(v.savedAt)}</span>
                          {i === 0 && <span className="version-now">현재</span>}
                        </div>
                        <div className="version-row" style={{ marginTop: 4 }}>
                          <div className="avatar avatar-xs" style={{ width: 16, height: 16, fontSize: 9 }}>{v.authorInitials}</div>
                          <span className="version-author">{v.authorName}</span>
                        </div>
                        <div className="version-summary">{v.blocks.length}개 블록</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: preview */}
            <div style={{ overflowY: "auto", padding: "18px 22px 8px" }}>
              {selected && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{selected.authorInitials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.authorName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-lo)" }}>
                        {formatAgo(selected.savedAt)} · {new Date(selected.savedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span className="chip">{selected.blocks.length}블록</span>
                  </div>

                  <div className="kicker" style={{ marginBottom: 8 }}>내용 미리보기</div>
                  <div className="version-preview">
                    {renderBlockPreview(selected.blocks)}
                    {selected.blocks.length > 8 && (
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
                        … 외 {selected.blocks.length - 8}개 블록
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="dialog-foot" style={{ flexShrink: 0 }}>
          {selectedIdx === 0 ? (
            <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
              현재 버전입니다. 다른 버전을 선택하면 되돌릴 수 있어요.
            </span>
          ) : (
            <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
              되돌리기 전 현재 내용은 새 버전으로 자동 보존돼요.
            </span>
          )}
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={restore}
            disabled={selectedIdx === 0 || restoring || !selected}
            style={(selectedIdx === 0 || !selected) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <Icon name="refresh" size={12} />{restoring ? "되돌리는 중..." : "이 버전으로 되돌리기"}
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.VersionHistoryDialog = VersionHistoryDialog;

/* ===========================================================
   PAGE INFO DIALOG — metadata + stats card
   =========================================================== */
function PageInfoDialog({ onClose, page, favorites }) {
  const { WIKI_TREE } = window.Planary;
  const parent = page.parent ? WIKI_TREE.find(w => w.id === page.parent) : null;
  const children = WIKI_TREE.filter(w => w.parent === page.id);
  const isFav = favorites && favorites.has(page.id);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Stats — synthetic but realistic
  const stats = {
    blocks: 18,
    words: 412,
    chars: 1247,
    reading: 3, // minutes
    images: 2,
    codeBlocks: 1,
    tables: 1,
    links: 6,
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(540px, 92vw)" }}>
        <div className="dialog-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-elev)", display: "grid", placeItems: "center", fontSize: 20, border: "1px solid var(--border)" }}>
              {page.icon}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em", display: "flex", alignItems: "center", gap: 8 }}>
                {page.title}
                {isFav && <Icon name="star" size={13} style={{ color: "var(--warn)", fill: "var(--warn)" }} />}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                ID · {page.id}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "10px 22px 14px" }}>
          {/* Top stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "블록", val: stats.blocks, icon: "list" },
              { label: "단어", val: stats.words, icon: "edit" },
              { label: "글자", val: stats.chars.toLocaleString(), icon: "hash" },
              { label: "읽기", val: `${stats.reading}분`, icon: "clock" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "10px 12px",
                background: "var(--bg-elev)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)",
                textAlign: "center",
              }}>
                <Icon name={s.icon} size={12} style={{ color: "var(--text-faint)", marginBottom: 4 }} />
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-hi)" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-lo)", letterSpacing: "0.04em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Detail rows */}
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <InfoRow icon="folder" label="상위 페이지" value={parent ? `${parent.icon}  ${parent.title}` : "최상위"} />
            <InfoRow icon="layers" label="하위 페이지" value={`${children.length}개`} />
            <InfoRow icon="clock" label="생성일" value="2025년 9월 14일 14:32" sub="62일 전" />
            <InfoRow icon="edit" label="마지막 수정" value="방금" sub="도하 김 · 1247자 → 1289자" />
            <InfoRow icon="user" label="작성자" value={(
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <div className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>DK</div>
                도하 김
              </span>
            )} />
            <InfoRow icon="globe" label="공개 범위" value="비공개" sub="초대된 사람만 볼 수 있음" />
            <InfoRow icon="link" label="링크" value={(
              <button
                className="mono"
                style={{ fontSize: 11, color: "var(--accent)", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                onClick={() => { navigator.clipboard?.writeText(`https://planary.app/w/${page.id}`); window.Planary.toast?.({ type: "ok", title: "링크가 복사됐어요" }); }}
              >
                planary.app/w/{page.id} <Icon name="copy" size={10} style={{ verticalAlign: -1, marginLeft: 4 }} />
              </button>
            )} last />
          </div>

          {/* Content composition */}
          <div className="kicker" style={{ marginTop: 18, marginBottom: 8 }}>구성</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="chip"><Icon name="image" size={10} />이미지 {stats.images}</span>
            <span className="chip"><Icon name="hash" size={10} />코드 블록 {stats.codeBlocks}</span>
            <span className="chip"><Icon name="grid" size={10} />표 {stats.tables}</span>
            <span className="chip"><Icon name="link" size={10} />링크 {stats.links}</span>
          </div>

          {/* Tags */}
          <div className="kicker" style={{ marginTop: 18, marginBottom: 8 }}>태그</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="tag">tokens</span>
            <span className="tag">color</span>
            <span className="tag">v3</span>
          </div>
        </div>

        <div className="dialog-foot">
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>실시간 정보</span>
          <button className="btn btn-sm btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, sub, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px",
      borderBottom: last ? 0 : "1px solid var(--border-soft)",
    }}>
      <div style={{ width: 22, color: "var(--text-lo)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={13} />
      </div>
      <div style={{ flex: 1, fontSize: 12, color: "var(--text-lo)", fontWeight: 600 }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-hi)", fontWeight: 600 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ===========================================================
   WIKI EXPORT — shared block→Markdown + structured vault builder
   Produces an Obsidian / AI-agent friendly vault: folder tree that
   mirrors the wiki hierarchy, YAML frontmatter per note, an index.md
   map-of-content, and a machine-readable manifest.json.
   =========================================================== */

// Convert a block's inline HTML into Markdown-ish plain text, keeping
// common inline formatting and decoding entities so agents get clean text.
function wikiHtmlToText(h) {
  return (h || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<(strong|b)>/gi, "**").replace(/<\/(strong|b)>/gi, "**")
    .replace(/<(em|i)>/gi, "*").replace(/<\/(em|i)>/gi, "*")
    .replace(/<code>/gi, "`").replace(/<\/code>/gi, "`")
    .replace(/<mark>/gi, "==").replace(/<\/mark>/gi, "==")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .trim();
}

// Block array (redesign decoded shape) → Markdown string.
function wikiBlocksToMarkdown(blocks) {
  const T = wikiHtmlToText;
  const out = [];
  (blocks || []).forEach((b) => {
    switch (b.type) {
      case "h1": out.push(`# ${T(b.content)}`, ""); break;
      case "h2": out.push(`## ${T(b.content)}`, ""); break;
      case "h3": out.push(`### ${T(b.content)}`, ""); break;
      case "p": { const t = T(b.content); if (t) out.push(t, ""); break; }
      case "quote": T(b.content).split("\n").forEach((ln) => out.push(`> ${ln}`)); out.push(""); break;
      case "code": out.push("```" + (b.language && b.language !== "plain" ? b.language : ""), b.content || "", "```", ""); break;
      case "math": out.push("$$", (b.content || "").trim(), "$$", ""); break;
      case "divider": out.push("---", ""); break;
      case "ul": (b.items || []).forEach((it) => out.push(`- ${T(it)}`)); out.push(""); break;
      case "ol": (b.items || []).forEach((it, i) => out.push(`${i + 1}. ${T(it)}`)); out.push(""); break;
      case "todo": (b.items || []).forEach((it) => out.push(`- [${it.checked ? "x" : " "}] ${T(it.text)}`)); out.push(""); break;
      case "image": out.push(`![${T(b.caption)}](${b.url || ""})`, ""); break;
      case "attach": out.push(`[${T(b.name) || b.url || "첨부"}](${b.url || ""})`, ""); break;
      case "link": { const title = T(b.title) || b.url || ""; out.push(`[${title}](${b.url || ""})`); if (b.description) out.push("", T(b.description)); out.push(""); break; }
      case "callout": {
        const v = { ok: "tip", info: "info", warn: "warning", warning: "warning", danger: "danger", error: "danger" }[b.variant] || "note";
        out.push(`> [!${v}] ${T(b.title)}`.trimEnd());
        T(b.body).split("\n").forEach((ln) => out.push(`> ${ln}`));
        out.push("");
        break;
      }
      case "table": if (b.rows && b.rows.length) {
        const r = b.rows;
        out.push(`| ${r[0].map((c) => T(c)).join(" | ")} |`);
        out.push(`|${r[0].map(() => " --- ").join("|")}|`);
        r.slice(1).forEach((row) => out.push(`| ${row.map((c) => T(c)).join(" | ")} |`));
        out.push("");
      } break;
      default: { const t = T(b.content); if (t) out.push(t, ""); }
    }
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Turn a title into a filesystem-safe name (keeps Unicode/Korean).
function wikiSlugify(title) {
  let s = (title || "").trim()
    .replace(/[\\/:*?"<>|\[\]#^]/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim();
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s;
}

const wikiIsoDate = (ms) => { try { return new Date(ms).toISOString().slice(0, 10); } catch (e) { return ""; } };

// Build a structured vault. opts:
//   rootId        — export this node + descendants (null = whole tree)
//   includeIds    — Set/array of ids to export (ancestors auto-included for
//                   folder structure); takes precedence over rootId scoping
//   includeJson   — add data/pages.json (lossless raw blocks, for re-import)
//   includeBundle — add bundle.md (all notes concatenated, for single-file agents)
function buildWikiVault(opts) {
  opts = opts || {};
  const rootId = opts.rootId || null;
  const includeIds = opts.includeIds ? new Set(opts.includeIds) : null;
  const includeJson = opts.includeJson !== false;
  const includeBundle = !!opts.includeBundle;

  const tree = window.Planary.WIKI_TREE || [];
  const pages = window.Planary.WIKI_PAGES || {};
  const byId = new Map(tree.map((n) => [n.id, n]));
  const childrenByParent = new Map();
  tree.forEach((n) => {
    const p = n.parent || null;
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p).push(n);
  });

  // Resolve which ids are in scope.
  let inScope;
  if (includeIds) {
    const set = new Set();
    includeIds.forEach((id) => { // include each selected node + its ancestors
      let cur = byId.get(id);
      while (cur && !set.has(cur.id)) { set.add(cur.id); cur = cur.parent ? byId.get(cur.parent) : null; }
    });
    inScope = (id) => set.has(id);
  } else if (rootId) {
    const set = new Set();
    const stack = [rootId];
    while (stack.length) { const id = stack.pop(); set.add(id); (childrenByParent.get(id) || []).forEach((k) => stack.push(k.id)); }
    inScope = (id) => set.has(id);
  } else {
    inScope = () => true;
  }

  const scopeRoots = rootId
    ? (byId.has(rootId) ? [byId.get(rootId)] : [])
    : (childrenByParent.get(null) || []);

  const files = [];
  const manifestPages = [];
  const indexLines = [];
  const bundleParts = [];
  const jsonPages = [];
  const imageUrls = new Set();
  const linkNameById = {}; // id → actual (deduped, slug-safe) note basename for [[wikilinks]]
  let count = 0;

  function emit(nodeList, dirParts, depth, crumbs) {
    const used = new Set();
    nodeList.forEach((node) => {
      if (!inScope(node.id)) {
        // Not selected — but a descendant might be, so keep walking (no file emitted).
        const kids0 = childrenByParent.get(node.id) || [];
        if (kids0.length) emit(kids0, dirParts, depth, crumbs);
        return;
      }
      const base = wikiSlugify(node.title) || ("untitled-" + node.id);
      let name = base, n = 2;
      while (used.has(name.toLowerCase())) name = `${base} (${n++})`;
      used.add(name.toLowerCase());
      linkNameById[node.id] = name;

      const kids = childrenByParent.get(node.id) || [];
      const entry = pages[node.id] || {};
      (entry.blocks || []).forEach((b) => { if (b.type === "image" && b.url && /^https?:/i.test(b.url)) imageUrls.add(b.url); });

      const fileDir = kids.length ? [...dirParts, name] : dirParts;
      const relPath = (kids.length ? [...fileDir, name + ".md"] : [...dirParts, name + ".md"]).join("/");
      const fullPath = "notes/" + relPath;
      const crumb = [...crumbs, node.title || "무제"];

      const tags = (entry.tags && entry.tags.length ? entry.tags : node.tags) || [];
      const fm = ["---"];
      fm.push(`id: ${node.id}`);
      fm.push(`title: ${JSON.stringify(node.title || "")}`);
      fm.push(`parent: ${node.parent ? node.parent : "null"}`);
      // Parent is always emitted before its children, so its link name is ready.
      if (node.parent && linkNameById[node.parent]) fm.push(`up: "[[${linkNameById[node.parent]}]]"`);
      if (tags.length) fm.push(`tags: [${tags.map((t) => JSON.stringify(t)).join(", ")}]`);
      if (node.icon) fm.push(`icon: ${JSON.stringify(node.icon)}`);
      if (entry.createdAt) fm.push(`created: ${wikiIsoDate(entry.createdAt)}`);
      if (entry.updatedAt) fm.push(`updated: ${wikiIsoDate(entry.updatedAt)}`);
      fm.push("source: plannary", "---", "");

      const mdBody = wikiBlocksToMarkdown(entry.blocks);
      files.push({ path: fullPath, content: fm.join("\n") + `# ${node.title || "무제"}\n\n` + mdBody });

      manifestPages.push({ id: node.id, title: node.title || "", parent: node.parent || null, path: fullPath, tags, children: kids.filter((k) => inScope(k.id)).map((k) => k.id) });
      indexLines.push(`${"  ".repeat(depth)}- [[${name}]]`);
      bundleParts.push(`<!-- id: ${node.id} · ${crumb.join(" / ")} -->\n\n${"#".repeat(Math.min(6, depth + 1))} ${node.title || "무제"}\n\n${mdBody}`);
      if (includeJson) jsonPages.push({ id: node.id, title: node.title || "", parent: node.parent || null, icon: node.icon || "📄", tags, createdAt: entry.createdAt || 0, updatedAt: entry.updatedAt || 0, blocks: entry.blocks || [] });
      count++;

      if (kids.length) emit(kids, fileDir, depth + 1, crumb);
    });
  }
  emit(scopeRoots, [], 0, []);

  const exportedAt = new Date().toISOString();
  const dateStr = exportedAt.slice(0, 10);
  const manifest = { source: "plannary", exportedAt, scope: includeIds ? "selection" : (rootId ? "subtree" : "all"), count, pages: manifestPages };
  const indexMd = `# Plannary Vault\n> ${dateStr} 내보냄 · ${count}개 문서\n\n${indexLines.join("\n")}\n`;
  const readmeLines = [
    "# Plannary Vault",
    "",
    "Plannary 위키에서 내보낸 마크다운 볼트입니다. 옵시디언에서 폴더로 열거나, AI 에이전트에 그대로 입력할 수 있어요.",
    "",
    "- `notes/` — 위키 문서(트리 구조 유지, 각 파일에 YAML frontmatter 포함)",
    "- `index.md` — 전체 문서 목차(Map of Content)",
    "- `manifest.json` — 기계 순회용 메타데이터(트리·경로·태그)",
  ];
  if (includeJson) readmeLines.push("- `data/pages.json` — 원본 블록(무손실). 다시 가져오기에 사용");
  if (includeBundle) readmeLines.push("- `bundle.md` — 전체 문서를 한 파일로 이어붙임(단일 입력용)");
  readmeLines.push("- `assets/` — 문서에 포함된 이미지(이미지 포함 옵션을 켠 경우)", "", `내보낸 시각: ${exportedAt}`, "");
  const readmeMd = readmeLines.join("\n");
  const bundleMd = includeBundle ? `# Plannary Vault — ${dateStr}\n\n${count}개 문서\n\n${bundleParts.join("\n\n---\n\n")}\n` : null;
  const pagesJson = includeJson ? { source: "plannary", exportedAt, count, pages: jsonPages } : null;

  return { files, manifest, indexMd, readmeMd, bundleMd, pagesJson, imageUrls, assets: [], count };
}

// Count how many pages a given scope would export (for the dialog summary).
function countWikiScope(rootId) {
  const tree = window.Planary.WIKI_TREE || [];
  if (!rootId) return tree.length;
  const childrenByParent = new Map();
  tree.forEach((n) => {
    const p = n.parent || null;
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p).push(n);
  });
  let c = 0;
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    c++;
    (childrenByParent.get(id) || []).forEach((k) => stack.push(k.id));
  }
  return c;
}

function wikiDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Derive a stable asset filename for an image URL.
function wikiImageAsset(url, mime) {
  const clean = url.split("?")[0];
  let ext = (clean.match(/\.([a-z0-9]{3,4})$/i) || [])[1];
  if (!ext && mime) ext = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg", "image/avif": "avif" }[mime];
  ext = (ext || "png").toLowerCase();
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return `img-${h.toString(36)}.${ext}`;
}

// Fetch every image referenced by the vault into assets/, then rewrite the
// Markdown links to point at the local copy (relative to each note's depth).
async function localizeWikiVaultImages(vault, onProgress) {
  const urls = [...(vault.imageUrls || [])];
  const urlToName = {};
  const assets = [];
  let done = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const name = wikiImageAsset(url, blob.type);
        assets.push({ path: `assets/${name}`, blob });
        urlToName[url] = name;
      }
    } catch (_) { /* keep original URL on failure */ }
    done++;
    onProgress && onProgress(done, urls.length);
  }
  const rewrite = (content, prefix) => {
    let out = content;
    for (const url in urlToName) out = out.split(`](${url})`).join(`](${prefix}assets/${urlToName[url]})`);
    return out;
  };
  vault.files = vault.files.map((f) => {
    const prefix = "../".repeat(f.path.split("/").slice(0, -1).length); // ../ per dir level back to vault root
    return { path: f.path, content: rewrite(f.content, prefix) };
  });
  if (vault.bundleMd) vault.bundleMd = rewrite(vault.bundleMd, "");
  vault.assets = assets;
  return assets.length;
}

function wikiVaultFiles(vault) {
  // Flatten everything the vault contains into {path, data} pairs.
  const out = vault.files.map((f) => ({ path: f.path, data: f.content }));
  out.push({ path: "index.md", data: vault.indexMd });
  out.push({ path: "manifest.json", data: JSON.stringify(vault.manifest, null, 2) });
  out.push({ path: "README.md", data: vault.readmeMd });
  if (vault.bundleMd) out.push({ path: "bundle.md", data: vault.bundleMd });
  if (vault.pagesJson) out.push({ path: "data/pages.json", data: JSON.stringify(vault.pagesJson, null, 2) });
  (vault.assets || []).forEach((a) => out.push({ path: a.path, data: a.blob }));
  return out;
}

async function downloadWikiVaultZip(vault, fileBase) {
  await window.__ensureJSZip?.();
  if (typeof JSZip === "undefined") {
    window.Planary.toast?.({ type: "err", title: "ZIP 라이브러리를 불러오지 못했어요", sub: "네트워크를 확인하고 다시 시도해 주세요" });
    return false;
  }
  const zip = new JSZip();
  const root = zip.folder(fileBase);
  wikiVaultFiles(vault).forEach((f) => root.file(f.path, f.data));
  const blob = await zip.generateAsync({ type: "blob" });
  wikiDownloadBlob(blob, fileBase + ".zip");
  return true;
}

// ── File System Access: write the vault straight into a chosen folder (opt-in,
//    desktop Chromium only). The directory handle is persisted in IndexedDB so a
//    later "save to last folder" only needs one click to re-grant permission.

function wikiIdbHandle(method, value) {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open("planary-fs", 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => req.result.createObjectStore("handles");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("handles", method === "get" ? "readonly" : "readwrite");
      const store = tx.objectStore("handles");
      const r = method === "get" ? store.get("wiki-vault-dir") : store.put(value, "wiki-vault-dir");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    };
  });
}
const saveWikiDirHandle = (h) => wikiIdbHandle("put", h).catch(() => {});
const loadWikiDirHandle = () => wikiIdbHandle("get").catch(() => null);
async function ensureWikiDirPermission(handle) {
  if (!handle) return false;
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

async function writeVaultToDirectory(dirHandle, vault) {
  const ensureDir = async (parts) => {
    let h = dirHandle;
    for (const p of parts) h = await h.getDirectoryHandle(p, { create: true });
    return h;
  };
  for (const f of wikiVaultFiles(vault)) {
    const parts = f.path.split("/");
    const fname = parts.pop();
    const dir = await ensureDir(parts);
    const fh = await dir.getFileHandle(fname, { create: true });
    const w = await fh.createWritable();
    await w.write(f.data);
    await w.close();
  }
}

window.Planary.wikiBlocksToMarkdown = wikiBlocksToMarkdown;
window.Planary.buildWikiVault = buildWikiVault;

/* ===========================================================
   EXPORT DIALOG — choose scope + format
   =========================================================== */
function ExportDialog({ onClose, page }) {
  const [scope, setScope] = useStateO("page"); // page | subtree | all | select
  const [selected, setSelected] = useStateO("md");
  const [optImages, setOptImages] = useStateO(true);
  const [optJson, setOptJson] = useStateO(true);
  const [optBundle, setOptBundle] = useStateO(false);
  const [selectedIds, setSelectedIds] = useStateO(() => new Set([page.id]));
  const [busy, setBusy] = useStateO(false);
  const [progress, setProgress] = useStateO("");
  const [savedDir, setSavedDir] = useStateO(null);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);

  useEffectO(() => { if (WIKI_FS_SUPPORTED) loadWikiDirHandle().then((h) => { if (h) setSavedDir(h); }); }, []);

  const scopes = [
    { id: "page", label: "이 페이지" },
    { id: "subtree", label: "하위 포함" },
    { id: "all", label: "전체 볼트" },
    { id: "select", label: "선택" },
  ];

  // Flat, depth-annotated tree for the "선택" picker.
  const treeRows = useMemoO(() => {
    const tree = window.Planary.WIKI_TREE || [];
    const kids = new Map();
    tree.forEach((n) => { const p = n.parent || null; if (!kids.has(p)) kids.set(p, []); kids.get(p).push(n); });
    const rows = [];
    (function walk(list, depth) { list.forEach((n) => { rows.push({ node: n, depth }); walk(kids.get(n.id) || [], depth + 1); }); })(kids.get(null) || [], 0);
    return rows;
  }, []);

  const selClosureCount = useMemoO(() => {
    const tree = window.Planary.WIKI_TREE || [];
    const byId = new Map(tree.map((n) => [n.id, n]));
    const set = new Set();
    selectedIds.forEach((id) => { let cur = byId.get(id); while (cur && !set.has(cur.id)) { set.add(cur.id); cur = cur.parent ? byId.get(cur.parent) : null; } });
    return set.size;
  }, [selectedIds]);

  const scopeCount = scope === "page" ? 1 : scope === "select" ? selClosureCount : countWikiScope(scope === "subtree" ? page.id : null);
  const isVault = scope !== "page";

  const formats = [
    { id: "pdf", label: "PDF", icon: "document", desc: "인쇄에 적합한 단일 파일", size: "~ 240 KB" },
    { id: "md", label: "Markdown", icon: "hash", desc: "다른 도구로 옮기기 좋음", size: "~ 8 KB" },
    { id: "html", label: "HTML", icon: "globe", desc: "스타일 포함, 웹에 게시", size: "~ 32 KB" },
    { id: "docx", label: "Word (.docx)", icon: "edit", desc: "Microsoft Word 호환", size: "~ 56 KB" },
  ];

  const toggleSel = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const baseName = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (scope === "subtree") return `plannary-${wikiSlugify(page.title) || "wiki"}-${dateStr}`;
    if (scope === "select") return `plannary-selection-${dateStr}`;
    return `plannary-vault-${dateStr}`;
  };

  // Build the vault from the current options (and localize images if requested).
  const makeVault = async () => {
    const vault = buildWikiVault({
      rootId: scope === "subtree" ? page.id : null,
      includeIds: scope === "select" ? [...selectedIds] : null,
      includeJson: optJson,
      includeBundle: optBundle,
    });
    if (!vault.count) { window.Planary.toast?.({ type: "warn", title: "내보낼 문서가 없어요" }); return null; }
    if (optImages && vault.imageUrls.size) {
      setProgress(`이미지 0/${vault.imageUrls.size}`);
      await localizeWikiVaultImages(vault, (d, t) => setProgress(`이미지 ${d}/${t}`));
      setProgress("");
    }
    return vault;
  };

  const handleExport = async () => {
    if (scope === "page") {
      if (selected === "md") {
        const entry = window.Planary.WIKI_PAGES?.[page.id] || {};
        const md = `# ${page.title}\n\n` + wikiBlocksToMarkdown(entry.blocks);
        wikiDownloadBlob(new Blob([md], { type: "text/markdown" }), `${wikiSlugify(page.title) || "untitled"}.md`);
        window.Planary.toast?.({ type: "ok", title: "Markdown 파일을 다운로드했어요", sub: `${page.title}.md` });
        onClose();
      } else {
        window.Planary.toast?.({ type: "warn", title: "곧 이용 가능해요", sub: "해당 형식은 현재 준비 중이에요" });
      }
      return;
    }
    setBusy(true);
    try {
      const vault = await makeVault();
      if (vault) {
        const base = baseName();
        const ok = await downloadWikiVaultZip(vault, base);
        if (ok) { window.Planary.toast?.({ type: "ok", title: "Markdown 볼트를 다운로드했어요", sub: `${base}.zip · ${vault.count}개 문서` }); onClose(); }
      }
    } catch (e) {
      window.Planary.toast?.({ type: "err", title: "내보내기에 실패했어요", sub: String((e && e.message) || e) });
    }
    setBusy(false);
  };

  const handleSaveToFolder = async (useSaved) => {
    setBusy(true);
    try {
      const dir = useSaved && savedDir ? savedDir : await window.showDirectoryPicker({ mode: "readwrite" });
      if (!(await ensureWikiDirPermission(dir))) {
        window.Planary.toast?.({ type: "warn", title: "폴더 권한이 필요해요" });
        setBusy(false);
        return;
      }
      const vault = await makeVault();
      if (vault) {
        await writeVaultToDirectory(dir, vault);
        await saveWikiDirHandle(dir);
        setSavedDir(dir);
        window.Planary.toast?.({ type: "ok", title: "폴더에 저장했어요", sub: `${vault.count}개 문서` });
        onClose();
      }
    } catch (e) {
      if (!e || e.name !== "AbortError") window.Planary.toast?.({ type: "err", title: "폴더 저장에 실패했어요", sub: String((e && e.message) || e) });
    }
    setBusy(false);
  };

  const optionRow = (on, set, title, desc) => (
    <button type="button" disabled={busy} onClick={() => set(!on)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r-md)", cursor: busy ? "default" : "pointer", textAlign: "left", marginBottom: 6 }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "grid", placeItems: "center", background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1.5px solid var(--text-faint)" }}>
        {on && <Icon name="check" size={12} stroke={3} style={{ color: "#fff" }} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-hi)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 10.5, color: "var(--text-lo)", marginTop: 1 }}>{desc}</span>
      </span>
    </button>
  );

  return (
    <div className="dialog-scrim" onClick={() => !busy && onClose()}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>내보내기</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}><strong style={{ color: "var(--text-md)" }}>{page.title}</strong>을(를) 어떻게 저장할까요?</p>
          </div>
          <button className="icon-btn" onClick={() => !busy && onClose()}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 14, maxHeight: "62vh", overflowY: "auto" }}>
          {/* Scope selector */}
          <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-md)", marginBottom: 12 }}>
            {scopes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                style={{
                  flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600,
                  borderRadius: "var(--r-sm)", cursor: "pointer", border: "none",
                  background: scope === s.id ? "var(--surface-1)" : "transparent",
                  color: scope === s.id ? "var(--text-hi)" : "var(--text-lo)",
                  boxShadow: scope === s.id ? "var(--shadow-sm)" : "none",
                  transition: "all var(--dur-fast)",
                }}
              >{s.label}</button>
            ))}
          </div>

          {isVault ? (
            <div style={{ padding: "4px 2px 2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "var(--accent-softer)", border: "1px solid var(--accent-ring)", borderRadius: "var(--r-md)", marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name="hash" size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)" }}>Markdown 볼트 (ZIP)</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 1 }}>{scopeCount}개 문서 · 옵시디언·AI 에이전트용 구조</div>
                </div>
              </div>

              {scope === "select" && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>상위 페이지는 경로 유지를 위해 자동 포함돼요</span>
                    <button type="button" onClick={() => setSelectedIds(selectedIds.size === treeRows.length ? new Set() : new Set(treeRows.map((r) => r.node.id)))}
                      style={{ fontSize: 10.5, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                      {selectedIds.size === treeRows.length ? "전체 해제" : "전체 선택"}
                    </button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 4 }}>
                    {treeRows.map(({ node, depth }) => {
                      const on = selectedIds.has(node.id);
                      return (
                        <button key={node.id} type="button" onClick={() => toggleSel(node.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 6px", paddingLeft: 6 + depth * 16, background: on ? "var(--accent-softer)" : "transparent", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: "grid", placeItems: "center", background: on ? "var(--accent)" : "transparent", border: on ? "none" : "1.5px solid var(--text-faint)" }}>
                            {on && <Icon name="check" size={11} stroke={3} style={{ color: "#fff" }} />}
                          </span>
                          <span style={{ fontSize: 13 }}>{node.icon || "📄"}</span>
                          <span style={{ fontSize: 12.5, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.title || "무제"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 10.5, color: "var(--text-faint)", fontWeight: 700, letterSpacing: "0.04em", margin: "4px 2px 6px" }}>포함할 항목</div>
              {optionRow(optImages, setOptImages, "이미지 포함 (assets/)", "이미지를 내려받아 함께 저장 — 오프라인에서도 안 깨짐")}
              {optionRow(optJson, setOptJson, "원본 JSON 동봉 (data/pages.json)", "무손실 백업 · 다시 가져오기에 사용")}
              {optionRow(optBundle, setOptBundle, "단일 번들 (bundle.md)", "전체를 한 파일로 이어붙임 — 일부 AI 입력에 편리")}

              {WIKI_FS_SUPPORTED && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginBottom: 6 }}>로컬 폴더에 직접 저장 — 선택한 폴더를 앱이 덮어씁니다 (데스크톱 Chrome)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" disabled={busy} onClick={() => handleSaveToFolder(!!savedDir)} style={{ flex: 1 }}>
                      <Icon name="folder" size={12} />{savedDir ? "지난 폴더에 저장" : "폴더 선택해 저장"}
                    </button>
                    {savedDir && <button className="btn btn-sm" disabled={busy} onClick={() => handleSaveToFolder(false)}>다른 폴더…</button>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            formats.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(f.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: "12px",
                  background: selected === f.id ? "var(--accent-softer)" : "transparent",
                  border: selected === f.id ? "1px solid var(--accent-ring)" : "1px solid transparent",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer", textAlign: "left",
                  transition: "all var(--dur-fast)",
                  marginBottom: 4,
                }}
                onMouseEnter={(e) => { if (selected !== f.id) e.currentTarget.style.background = "var(--hover)"; }}
                onMouseLeave={(e) => { if (selected !== f.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: selected === f.id ? "var(--accent-soft)" : "var(--surface-2)",
                  color: selected === f.id ? "var(--accent)" : "var(--text-lo)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icon name={f.icon} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)" }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 1 }}>{f.desc}</div>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{f.size}</span>
                {selected === f.id && <Icon name="check" size={14} stroke={3} style={{ color: "var(--accent)" }} />}
              </button>
            ))
          )}
        </div>
        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>{busy ? (progress || "내보내는 중…") : "로컬에 다운로드됩니다"}</div>
          <button className="btn btn-sm" disabled={busy} onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleExport}>
            <Icon name="download" size={12} />{isVault ? "ZIP 다운로드" : "내보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.PageInfoDialog = PageInfoDialog;
window.Planary.ExportDialog = ExportDialog;

/* ===========================================================
   WIKI IMPORT — vault(.zip) / pages.json / .md → new pages
   =========================================================== */

const wikiBlockId = () => "b" + Math.random().toString(36).slice(2, 10);

// Minimal Markdown → block parser (decoded redesign shape). Best-effort:
// covers the constructs the exporter emits.
function wikiMarkdownToBlocks(md) {
  const lines = (md || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push({ id: wikiBlockId(), type: "code", content: buf.join("\n"), language: lang || "plain" });
      continue;
    }
    if (/^\$\$\s*$/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push({ id: wikiBlockId(), type: "math", content: buf.join("\n").trim() });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { blocks.push({ id: wikiBlockId(), type: "h" + h[1].length, content: h[2] }); i++; continue; }
    const callout = line.match(/^>\s?\[!(\w+)\]\s*(.*)$/);
    if (callout) {
      const body = []; i++;
      while (i < lines.length && /^>\s?/.test(lines[i])) { body.push(lines[i].replace(/^>\s?/, "")); i++; }
      const variant = { tip: "ok", info: "info", warning: "warn", danger: "danger", note: "info" }[callout[1]] || "ok";
      blocks.push({ id: wikiBlockId(), type: "callout", variant, title: callout[2] || "", body: body.join("\n") });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push({ id: wikiBlockId(), type: "quote", content: buf.join("\n") });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { blocks.push({ id: wikiBlockId(), type: "divider" }); i++; continue; }
    if (/^[-*]\s+\[[ xX]\]/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+\[[ xX]\]/.test(lines[i])) {
        const m = lines[i].match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
        items.push({ text: m[2], checked: /x/i.test(m[1]) }); i++;
      }
      blocks.push({ id: wikiBlockId(), type: "todo", items });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i]) && !/^[-*]\s+\[[ xX]\]/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, "")); i++; }
      blocks.push({ id: wikiBlockId(), type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, "")); i++; }
      blocks.push({ id: wikiBlockId(), type: "ol", items });
      continue;
    }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (img && /^https?:/i.test(img[2])) { blocks.push({ id: wikiBlockId(), type: "image", url: img[2], caption: img[1] }); i++; continue; }
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const parseRow = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const rows = [parseRow(line)]; i += 2;
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { rows.push(parseRow(lines[i])); i++; }
      blocks.push({ id: wikiBlockId(), type: "table", rows });
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,3}\s|>|```|\$\$|[-*]\s|\d+\.\s|(?:-{3,}|\*{3,})\s*$|\|)/.test(lines[i])) buf.push(lines[i++]);
    blocks.push({ id: wikiBlockId(), type: "p", content: buf.join("\n") });
  }
  return blocks;
}

function wikiParseFrontmatter(md) {
  const fm = {};
  let body = md || "";
  if (/^---\s*\n/.test(body)) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) {
      const block = body.slice(body.indexOf("\n") + 1, end);
      body = body.slice(end + 4).replace(/^\s*\n/, "");
      block.split("\n").forEach((l) => {
        const m = l.match(/^(\w+):\s*(.*)$/);
        if (!m) return;
        const key = m[1]; let v = m[2].trim();
        if (key === "tags") { try { fm.tags = JSON.parse(v); } catch (_) { fm.tags = []; } return; }
        if (v === "null" || v === "") { fm[key] = null; return; }
        if (v[0] === '"') { try { v = JSON.parse(v); } catch (_) {} }
        fm[key] = v;
      });
    }
  }
  return { fm, body };
}

// One .md file → a page object.
function wikiPageFromMarkdown(md, fallbackTitle) {
  const { fm, body } = wikiParseFrontmatter(md);
  let blocks = wikiMarkdownToBlocks(body);
  let title = fm.title || fallbackTitle || "";
  if (!fm.title && blocks[0] && blocks[0].type === "h1") { title = blocks[0].content; blocks = blocks.slice(1); }
  else if (fm.title && blocks[0] && blocks[0].type === "h1" && blocks[0].content === fm.title) blocks = blocks.slice(1);
  return { id: fm.id || null, title: title || "가져온 문서", parent: fm.parent || null, icon: fm.icon || "📄", tags: Array.isArray(fm.tags) ? fm.tags : [], blocks };
}

const wikiNormalizePage = (p) => ({ id: p.id || null, title: p.title || "가져온 문서", parent: p.parent || null, icon: p.icon || "📄", tags: Array.isArray(p.tags) ? p.tags : [], blocks: Array.isArray(p.blocks) ? p.blocks : [] });

// Read a chosen File → array of page objects.
async function readWikiImportFile(file) {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".json")) {
    const data = JSON.parse(await file.text());
    return (Array.isArray(data) ? data : (data.pages || [])).map(wikiNormalizePage);
  }
  if (name.endsWith(".md") || name.endsWith(".markdown")) {
    return [wikiPageFromMarkdown(await file.text(), file.name.replace(/\.(md|markdown)$/i, ""))];
  }
  if (name.endsWith(".zip")) {
    await window.__ensureJSZip?.();
    if (typeof JSZip === "undefined") throw new Error("ZIP 라이브러리를 불러오지 못했어요");
    const zip = await JSZip.loadAsync(file);
    let jsonEntry = null;
    zip.forEach((path, entry) => { if (!entry.dir && /(^|\/)data\/pages\.json$/.test(path)) jsonEntry = entry; });
    if (jsonEntry) {
      const data = JSON.parse(await jsonEntry.async("string"));
      return (Array.isArray(data) ? data : (data.pages || [])).map(wikiNormalizePage);
    }
    const mdEntries = [];
    zip.forEach((path, entry) => { if (!entry.dir && /\.md$/i.test(path) && !/(^|\/)(index|README|bundle)\.md$/i.test(path)) mdEntries.push(entry); });
    const pages = [];
    for (const e of mdEntries) pages.push(wikiPageFromMarkdown(await e.async("string"), (e.name.split("/").pop() || "").replace(/\.md$/i, "")));
    return pages;
  }
  throw new Error("지원하지 않는 파일이에요");
}

// Create imported pages as NEW wiki pages (parents first), preserving hierarchy.
async function importWikiPages(pages, onProgress) {
  const api = window.Planary.api;
  if (!api || !api.createWikiPage) throw new Error("로그인이 필요해요");
  const genId = window.Planary.generateId || (() => "w" + Math.random().toString(36).slice(2, 12));
  const byId = new Map(pages.filter((p) => p.id).map((p) => [p.id, p]));
  const childrenOf = new Map();
  pages.forEach((p) => { const k = (p.parent && byId.has(p.parent)) ? p.parent : null; if (!childrenOf.has(k)) childrenOf.set(k, []); childrenOf.get(k).push(p); });
  const ordered = [];
  (function walk(k) { (childrenOf.get(k) || []).forEach((p) => { ordered.push(p); if (p.id) walk(p.id); }); })(null);
  pages.forEach((p) => { if (!ordered.includes(p)) ordered.push(p); }); // any stragglers

  const idMap = {};
  let done = 0;
  for (const p of ordered) {
    const newId = genId();
    if (p.id) idMap[p.id] = newId;
    const parentId = (p.parent && idMap[p.parent]) ? idMap[p.parent] : null;
    await api.createWikiPage(p.title || "가져온 문서", parentId, newId);
    await api.updateWikiPageMeta(newId, { icon: p.icon || "📄", tags: Array.isArray(p.tags) ? p.tags : [], parentId });
    if (p.blocks && p.blocks.length) await api.saveWikiBlocks(newId, p.blocks);
    done++;
    onProgress && onProgress(done, ordered.length);
  }
  return done;
}

window.Planary.importWikiPages = importWikiPages;
window.Planary.readWikiImportFile = readWikiImportFile;

function ImportDialog({ onClose }) {
  const [busy, setBusy] = useStateO(false);
  const [progress, setProgress] = useStateO("");
  const [file, setFile] = useStateO(null);
  const inputRef = useRefO(null);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);

  const doImport = async () => {
    if (!file) { inputRef.current && inputRef.current.click(); return; }
    setBusy(true);
    try {
      const pages = await readWikiImportFile(file);
      if (!pages.length) { window.Planary.toast?.({ type: "warn", title: "가져올 수 있는 문서가 없어요" }); setBusy(false); return; }
      setProgress(`0/${pages.length}`);
      const n = await importWikiPages(pages, (d, t) => setProgress(`${d}/${t}`));
      window.Planary.toast?.({ type: "ok", title: `${n}개 문서를 가져왔어요`, sub: file.name });
      onClose();
    } catch (e) {
      window.Planary.toast?.({ type: "err", title: "가져오기에 실패했어요", sub: String((e && e.message) || e) });
    }
    setBusy(false);
  };

  return (
    <div className="dialog-scrim" onClick={() => !busy && onClose()}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>위키로 가져오기</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>볼트(.zip)나 pages.json, .md 파일을 선택하세요</p>
          </div>
          <button className="icon-btn" onClick={() => !busy && onClose()}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 14 }}>
          <input ref={inputRef} type="file" accept=".zip,.json,.md,.markdown" style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files && e.target.files[0])} />
          <button type="button" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%", padding: "22px 12px", background: "var(--surface-2)", border: "1.5px dashed var(--border)", borderRadius: "var(--r-md)", cursor: busy ? "default" : "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
              <Icon name="inbox" size={18} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file ? file.name : "파일 선택"}</div>
          </button>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, textAlign: "center" }}>새 페이지로 추가돼요 · 기존 문서는 그대로예요</div>
        </div>
        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>{busy ? (progress || "가져오는 중…") : ""}</div>
          <button className="btn btn-sm" disabled={busy} onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" disabled={busy || !file} onClick={doImport}>
            <Icon name="inbox" size={12} />가져오기
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.ImportDialog = ImportDialog;

/* ===========================================================
   DUPLICATE PAGE DIALOG
   =========================================================== */
function DuplicatePageDialog({ node, tree, collectDescendants, onClose, onConfirm }) {
  const [title, setTitle] = useStateO(node.title + " (복사)");
  const [includeChildren, setIncludeChildren] = useStateO(true);
  const childCount = collectDescendants(node.id).length - 1;
  const inputRef = useRefO(null);

  useEffectO(() => {
    setTimeout(() => {
      if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
    }, 50);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [title, includeChildren]);

  const confirm = () => {
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), includeChildren });
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>페이지 복제</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>같은 위치에 사본을 만듭니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          {/* Source preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--bg-elev)", borderRadius: "var(--r-md)", marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{node.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{node.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>
                {childCount > 0 ? `하위 페이지 ${childCount}개` : "하위 페이지 없음"}
              </div>
            </div>
          </div>

          {/* Title input */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>새 페이지 이름</span>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              style={{ marginTop: 5 }}
              placeholder="페이지 이름"
            />
          </label>

          {/* Include children toggle */}
          {childCount > 0 && (
            <label
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: 12,
                background: "var(--bg-elev)",
                border: includeChildren ? "1px solid var(--accent-ring)" : "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                transition: "all var(--dur-fast)",
              }}
              onClick={() => setIncludeChildren(!includeChildren)}
            >
              <button
                type="button"
                className={`checkbox ${includeChildren ? "is-checked" : ""}`}
                onClick={(e) => { e.preventDefault(); setIncludeChildren(!includeChildren); }}
              >
                {includeChildren && <Icon name="check" size={11} stroke={3} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>하위 페이지도 복제</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>
                  {includeChildren ? `${childCount}개 페이지가 함께 복제됩니다` : "이 페이지만 복제합니다"}
                </div>
              </div>
            </label>
          )}
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            <span className="kbd">⌘↵</span>로 빠르게 확인
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" onClick={confirm} disabled={!title.trim()}>
            <Icon name="copy" size={12} />복제
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.DuplicatePageDialog = DuplicatePageDialog;

/* ===========================================================
   WIKI TOC — auto-generated from h2 / h3 blocks
   =========================================================== */
function WikiTOC({ blocks }) {
  const [activeHash, setActiveHash] = useStateO(null);
  const items = (blocks || [])
    .filter((b) => b.type === "h2" || b.type === "h3")
    .map((b) => {
      const text = (b.content || "").replace(/<[^>]+>/g, "").trim() || "(제목 없음)";
      return { id: b.id, text, level: b.type };
    });

  // Scroll-spy: highlight the heading whose block-row is closest to top
  useEffectO(() => {
    if (items.length === 0) return;
    const onScroll = () => {
      let bestId = items[0].id;
      let bestDist = Infinity;
      for (const it of items) {
        // Find the rendered heading element by its block content id wrapper —
        // we look up the contenteditable inside the matching block row.
        const row = document.querySelector(`.wiki-block-row[data-block-id="${it.id}"]`);
        if (!row) continue;
        const r = row.getBoundingClientRect();
        const dist = Math.abs(r.top - 80);
        if (r.top < window.innerHeight && r.top > -r.height && dist < bestDist) {
          bestDist = dist;
          bestId = it.id;
        }
      }
      setActiveHash(bestId);
    };
    onScroll();
    const main = document.querySelector(".page");
    main && main.addEventListener("scroll", onScroll, { passive: true });
    return () => main && main.removeEventListener("scroll", onScroll);
  }, [items.length, items.map((i) => i.id).join("|")]);

  const scrollTo = (id) => {
    const row = document.querySelector(`.wiki-block-row[data-block-id="${id}"]`);
    if (row) {
      const main = document.querySelector(".page");
      if (main) {
        const targetTop = row.getBoundingClientRect().top + main.scrollTop - 60;
        main.scrollTo({ top: targetTop, behavior: "smooth" });
      } else {
        row.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setActiveHash(id);
  };

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-faint)", padding: "8px 4px" }}>
        제목(H2 / H3)을 추가하면 자동으로 목차가 생성돼요
      </div>
    );
  }

  return (
    <div>
      {items.map((it) => (
        <div
          key={it.id}
          className={`toc-link ${it.level === "h3" ? "is-sub" : ""} ${activeHash === it.id ? "is-active" : ""}`}
          onClick={() => scrollTo(it.id)}
          role="button"
          tabIndex={0}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

/* ===========================================================
   RELATED TASKS — filtered by tag overlap with the page
   =========================================================== */
function RelatedTasks({ activePage }) {
  const { TASKS } = window.Planary;
  // Derive keywords from the page title (tokenize on space / punctuation)
  const title = (activePage && activePage.title) || "";
  const keywords = title.toLowerCase().split(/[\s·.,/—-]+/).filter((s) => s.length >= 2);

  const matches = TASKS.filter((t) => {
    const tags = (t.tags || []).map((x) => x.toLowerCase());
    if (keywords.some((k) => tags.includes(k))) return true;
    const blob = (t.title + " " + (t.memo || "")).toLowerCase();
    return keywords.some((k) => blob.includes(k));
  }).slice(0, 4);

  if (matches.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "6px 4px" }}>
        제목 키워드와 일치하는 작업이 없어요
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.5 }}>
        제목 키워드와 일치하는 작업 · 자동 매칭
      </div>
      {matches.map((t) => (
        <div key={t.id} className="focus-row" style={{ padding: "6px 8px", cursor: "pointer" }}>
          <div
            className={`checkbox ${t.done ? "is-checked" : ""}`}
            style={{ width: 14, height: 14 }}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("planary:toggle-task", { detail: t.id }));
            }}
          >
            {t.done && <Icon name="check" size={9} stroke={3} />}
          </div>
          <span
            style={{
              flex: 1, fontSize: 12, color: "var(--text-md)",
              textDecoration: t.done ? "line-through" : "none",
              opacity: t.done ? 0.55 : 1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
            onClick={() => window.dispatchEvent(new CustomEvent("planary:edit-task", { detail: t }))}
          >
            {t.title}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ===========================================================
   BACKLINKS — pages that mention the current page title
   =========================================================== */
function Backlinks({ activePage }) {
  const { WIKI_TREE } = window.Planary;
  const title = (activePage && activePage.title) || "";

  // Show the chain of parent pages (genuine relations) as backlinks
  const parents = [];
  let cur = activePage;
  while (cur && cur.parent) {
    const p = WIKI_TREE.find((w) => w.id === cur.parent);
    if (!p) break;
    parents.unshift(p);
    cur = p;
  }

  if (parents.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "6px 4px" }}>
        이 페이지를 참조하는 다른 페이지가 없어요
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.5 }}>
        하위 페이지로 등록된 위치
      </div>
      {parents.map((p) => (
        <div key={p.id} className="toc-link">
          <span style={{ marginRight: 4 }}>{p.icon}</span>
          {p.title}
        </div>
      ))}
    </div>
  );
}

/* ===========================================================
   SLASH COMMAND MENU — Notion-style block type picker
   =========================================================== */
function SlashCommandMenu({ slashMenu, onClose, onPick }) {
  const [query, setQuery] = useStateO("");
  const [highlight, setHighlight] = useStateO(0);

  const commands = [
    // Basic
    { group: "기본",     id: "p",        label: "본문",        desc: "기본 텍스트 블록",         icon: "edit",     keywords: "text para 본문 글" },
    { group: "기본",     id: "h1",       label: "헤딩 1",      desc: "큰 제목",               icon: "hash",     keywords: "heading h1 대제목 큰제목" },
    { group: "기본",     id: "h2",       label: "헤딩 2",      desc: "중간 크기 제목",          icon: "hash",     keywords: "heading h2 중제목 제목" },
    { group: "기본",     id: "h3",       label: "헤딩 3",      desc: "작은 제목",              icon: "hash",     keywords: "heading h3 소제목 제목" },
    // Lists
    { group: "리스트",   id: "ul",       label: "글머리 기호",   desc: "• 항목 · 자유 순서",       icon: "list",     keywords: "list unordered bullet 글머리" },
    { group: "리스트",   id: "ol",       label: "번호 매기기",   desc: "1. 항목 · 순서 있음",      icon: "list",     keywords: "list ordered 번호" },
    { group: "리스트",   id: "todo",     label: "체크리스트",    desc: "☑ 완료 체크",            icon: "check",    keywords: "todo checklist 체크 할일" },
    // Rich
    { group: "리치",     id: "quote",    label: "인용",        desc: "강조된 한 줄",           icon: "edit",     keywords: "quote 인용 blockquote" },
    { group: "리치",     id: "callout",  label: "콜아웃",      desc: "강조 박스 + 아이콘",      icon: "sparkles", keywords: "callout 콜아웃 강조 박스" },
    { group: "리치",     id: "divider",  label: "구분선",      desc: "섹션 사이 구분",          icon: "list",     keywords: "divider 구분 hr line" },
    // Code & data
    { group: "코드·데이터", id: "code",     label: "코드 블록",   desc: "언어별 코드 + 복사",      icon: "command",  keywords: "code 코드 syntax" },
    { group: "코드·데이터", id: "math",     label: "수식",        desc: "KaTeX LaTeX 수식",       icon: "hash",     keywords: "math 수식 katex latex" },
    { group: "코드·데이터", id: "table",    label: "표",          desc: "행과 열 데이터",         icon: "grid",     keywords: "table 표 데이터" },
    // Media
    { group: "미디어",   id: "image",    label: "이미지",      desc: "PNG · JPG · 업로드/URL",  icon: "image",    keywords: "image 이미지 사진 그림" },
    { group: "미디어",   id: "attach",   label: "파일 첨부",    desc: "어떤 파일이든 첨부",      icon: "paperclip", keywords: "file attach 첨부 파일" },
    { group: "미디어",   id: "link",     label: "북마크/임베드", desc: "URL 미리보기 카드",       icon: "link",     keywords: "link bookmark embed 북마크" },
  ];

  const filtered = query
    ? commands.filter(c => (c.label + " " + c.keywords + " " + c.desc).toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffectO(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => (h + 1) % Math.max(1, filtered.length)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => (h - 1 + filtered.length) % Math.max(1, filtered.length)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const c = filtered[highlight];
        if (c) onPick(c.id);
        return;
      }
      if (e.key === "Backspace" && query === "") { onClose(); return; }
      // Filter out "/" itself (it was the trigger key)
      if (e.key === "/") { return; }
      if (e.key.length === 1) { setQuery(q => q + e.key); setHighlight(0); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, highlight, query]);

  // Reset highlight on filter change
  useEffectO(() => { setHighlight(0); }, [query]);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose} />
      <div
        className="slash-menu"
        style={{
          position: "fixed",
          left: Math.min(slashMenu.x, window.innerWidth - 300),
          top: Math.min(slashMenu.y, window.innerHeight - 320),
          zIndex: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slash-menu-head">
          <Icon name="command" size={12} style={{ color: "var(--accent)" }} />
          <span style={{ flex: 1 }}>
            {query ? <span className="mono">/{query}</span> : "블록 타입을 선택하세요"}
          </span>
          <span className="kbd">Esc</span>
        </div>
        <div className="slash-menu-list">
          {filtered.length === 0 && (
            <div style={{ padding: 14, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
              "{query}"에 해당하는 블록이 없어요
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`slash-menu-item ${i === highlight ? "is-highlight" : ""}`}
              onClick={() => onPick(c.id)}
              onMouseEnter={() => setHighlight(i)}
            >
              <div className="slash-menu-icon">
                <Icon name={c.icon} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="slash-menu-label">{c.label}</div>
                <div className="slash-menu-desc">{c.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="slash-menu-foot">
          <span><span className="kbd">↑↓</span> 이동</span>
          <span><span className="kbd">↵</span> 선택</span>
        </div>
      </div>
    </>
  );
}

window.Planary.SlashCommandMenu = SlashCommandMenu;

