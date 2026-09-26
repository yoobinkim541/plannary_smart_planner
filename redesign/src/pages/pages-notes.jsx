// Sticky-note board and its editing toolbar.
// Uses the shared React hook aliases initialized by pages-rest.jsx.
/* ===========================================================
   NOTES (drag-and-drop sticky board)
   =========================================================== */
function NotesPage() {
  // Merge Firestore notes with localStorage-cached positions so positions
  // survive navigation without waiting for a Firestore round-trip.
  const initialNotes = (() => {
    const base = Array.isArray(window.Planary.NOTES) ? window.Planary.NOTES : [];
    try {
      const cached = JSON.parse(localStorage.getItem("planary.note-positions") || "{}");
      if (cached && typeof cached === "object") {
        return base.map(n => cached[n.id] ? { ...n, x: cached[n.id].x, y: cached[n.id].y } : n);
      }
    } catch (_) {}
    return base;
  })();
  const [notes, setNotes] = useStateO(initialNotes);
  const [draftColor, setDraftColor] = useStateO("yellow");
  const [draft, setDraft] = useStateO("");
  const [view, setView] = useStateO("board"); // board | grid
  const [editing, setEditing] = useStateO(null); // { id, text, color } | null
  const [colorMenuFor, setColorMenuFor] = useStateO(null); // note id whose color menu is open
  const [search, setSearch] = useStateO("");
  const [colorFilter, setColorFilter] = useStateO(null); // null = all
  const boardRef = useRefO(null);
  const dragRef = useRefO(null);
  const editAreaRef = useRefO(null);
  const NOTE_W = 200;
  const NOTE_H = 144;
  const BOARD_PAD = 8;
  const getBoardBounds = () => {
    const el = boardRef.current;
    if (!el) return { width: 0, height: 0 };
    const rect = el.getBoundingClientRect();
    return {
      width: Math.max(rect.width, el.scrollWidth || 0),
      height: Math.max(rect.height, el.scrollHeight || 0)
    };
  };
  const clampNotePosition = (x, y) => {
    const bounds = getBoardBounds();
    const maxX = Math.max(0, bounds.width - NOTE_W - BOARD_PAD);
    const maxY = Math.max(0, bounds.height - NOTE_H - BOARD_PAD);
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    };
  };

  // Focus textarea when entering edit mode
  useEffectO(() => {
    if (editing && editAreaRef.current) {
      const el = editAreaRef.current;
      el.focus();
      // Move cursor to end
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editing && editing.id]);

  // Live-sync notes from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      if (Array.isArray(e.detail)) setNotes(e.detail);
    };
    window.addEventListener("planary:notes-loaded", onLoaded);
    return () => window.removeEventListener("planary:notes-loaded", onLoaded);
  }, []);

  const startEdit = (n) => setEditing({ id: n.id, text: n.text, color: n.color });
  const cancelEdit = () => setEditing(null);
  const commitEdit = () => {
    if (!editing) return;
    const trimmed = editing.text.trim();
    if (!trimmed) {
      // Empty -> delete the note
      setNotes((prev) => prev.filter((n) => n.id !== editing.id));
      window.dispatchEvent(new CustomEvent("planary:delete-note", { detail: editing.id }));
    } else {
      setNotes((prev) => prev.map((n) =>
        n.id === editing.id
          ? { ...n, text: trimmed, color: editing.color, date: "방금 수정", rot: n.dragging ? n.rot : n.rot }
          : n
      ));
      window.dispatchEvent(new CustomEvent("planary:update-note", {
        detail: { id: editing.id, patch: { text: trimmed, color: editing.color } },
      }));
    }
    setEditing(null);
  };

  const cycleColor = (id) => {
    const order = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];
    let nextColor = null;
    setNotes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      nextColor = order[(order.indexOf(n.color) + 1) % order.length];
      return { ...n, color: nextColor };
    }));
    if (nextColor) {
      window.dispatchEvent(new CustomEvent("planary:update-note", {
        detail: { id, patch: { color: nextColor } },
      }));
    }
  };

  const duplicateNote = (n) => {
    const id = window.Planary?.generateId?.() || "n" + Date.now();
    setNotes((prev) => [
      { ...n, id, x: n.x + 24, y: n.y + 24, rot: (Math.random() - 0.5) * 4, date: "방금 복제" },
      ...prev,
    ]);
    window.dispatchEvent(new CustomEvent("planary:create-note", {
      detail: { id, text: n.text, color: n.color, x: n.x + 24, y: n.y + 24 },
    }));
  };

  const onPointerDown = (e, note) => {
    if (e.target.closest(".note-foot") || e.target.closest(".note-toolbar") || e.target.tagName === "BUTTON" || e.target.tagName === "TEXTAREA") return;
    // Don't drag the note we're editing
    if (editing && editing.id === note.id) return;
    // Left click only (pointer button === 0). Touch and pen also report 0.
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    dragRef.current = {
      id: note.id,
      offX: e.clientX - rect.left - note.x,
      offY: e.clientY - rect.top - note.y,
      moved: false,
      startX: e.clientX,
      startY: e.clientY
    };
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, dragging: true } : n));
    // Capture pointer so we still get move/up if cursor leaves the element
    try { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  useEffectO(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d || !boardRef.current) return;
      // Track whether the pointer actually moved enough to be a drag
      if (!d.moved && (Math.abs(e.clientX - d.startX) > 3 || Math.abs(e.clientY - d.startY) > 3)) {
        d.moved = true;
      }
      const rect = boardRef.current.getBoundingClientRect();
      const { x, y } = clampNotePosition(
        e.clientX - rect.left - d.offX,
        e.clientY - rect.top - d.offY
      );
      setNotes((prev) => prev.map((n) => n.id === d.id ? { ...n, x, y } : n));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d) {
        let finalPos = null;
        setNotes((prev) => prev.map((n) => {
          if (n.id !== d.id) return n;
          if (d.moved) finalPos = { x: n.x, y: n.y };
          return { ...n, dragging: false };
        }));
        if (finalPos) {
          window.dispatchEvent(new CustomEvent("planary:update-note", {
            detail: { id: d.id, patch: finalPos },
          }));
          // Cache all positions in localStorage for instant restore on navigation
          setNotes((prev) => {
            try {
              const posMap = {};
              prev.forEach(n => { posMap[n.id] = { x: n.x, y: n.y }; });
              posMap[d.id] = finalPos;
              localStorage.setItem("planary.note-positions", JSON.stringify(posMap));
            } catch (_) {}
            return prev;
          });
        }
        dragRef.current = null;
      }
    };
    // Use pointer events so we survive touch + mouse leaving window
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // Cancel any in-flight drag if user releases off-window
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  const addNote = () => {
    if (!draft.trim()) return;
    const id = window.Planary?.generateId?.() || "n" + Date.now();
    const x = 60 + Math.random() * 200;
    const y = 60 + Math.random() * 100;
    const text = draft.trim();
    setNotes((prev) => [
    { id, x, y, color: draftColor, text, date: "방금", rot: (Math.random() - 0.5) * 4, dragging: false },
    ...prev]
    );
    window.dispatchEvent(new CustomEvent("planary:create-note", {
      detail: { id, text, color: draftColor, x, y },
    }));
    setDraft("");
  };

  const colors = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];

  const filteredNotes = notes.filter(n => {
    if (colorFilter && n.color !== colorFilter) return false;
    if (search && !n.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const boardH = notes.length === 0 ? 320 : Math.max(480, Math.max(...notes.map(n => (n.y || 0) + 200)));

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="kicker">WORKSPACE · 포스트잇 보드</div>
          <div className="page-title">포스트잇
</div>
          <div className="page-sub">{filteredNotes.length !== notes.length ? `${filteredNotes.length} / ${notes.length}개` : `${notes.length}개`} · 드래그해 자유롭게 배치하거나 그리드로 정렬하세요</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="메모 검색…"
              style={{
                height: 32, paddingLeft: 30, paddingRight: search ? 28 : 10,
                background: "var(--surface-2)", border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)", fontSize: 13, color: "var(--text-hi)",
                outline: "none", width: 160,
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-faint)" }}>
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
          <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-md)", gap: 2 }}>
            <button onClick={() => setView("board")}
            className="btn btn-sm"
            style={{ height: 28, background: view === "board" ? "var(--surface)" : "transparent", color: view === "board" ? "var(--text-hi)" : "var(--text-lo)", boxShadow: view === "board" ? "var(--shadow-sm)" : "none" }}>
              <Icon name="layers" size={13} />보드
            </button>
            <button
              onClick={() => setView("grid")}
              className="btn btn-sm"
              style={{ height: 28, background: view === "grid" ? "var(--surface)" : "transparent", color: view === "grid" ? "var(--text-hi)" : "var(--text-lo)", boxShadow: view === "grid" ? "var(--shadow-sm)" : "none" }}>
              <Icon name="grid" size={13} />그리드
            </button>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!notes.length) return;
              const text = notes.map(n => `[${n.color}] ${n.text}`).join("\n\n");
              navigator.clipboard?.writeText(text).then(() =>
                window.Planary.toast?.({ type: "ok", title: "클립보드에 복사됨" })
              );
            }}
          ><Icon name="download" size={14} />내보내기</button>
        </div>
      </div>

      <div className="composer" style={{ marginBottom: 14 }}>
        <div className="composer-row">
          <Icon name="edit" size={16} style={{ color: "var(--accent)" }} />
          <input
            className="composer-input"
            placeholder="떠오른 생각을 그대로 적어두세요… ⌘+Enter로 저장"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();else
              if (e.key === "Enter" && !e.shiftKey) addNote();
            }} />

        </div>
        <div className="composer-tools">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-lo)", marginRight: 4, fontWeight: 600 }}>색상</span>
            {colors.map((c) =>
            <button
              key={c}
              className={`note note-${c}`}
              onClick={() => setDraftColor(c)}
              style={{
                position: "static",
                width: 22, height: 22,
                minHeight: 22, padding: 0,
                borderRadius: 5,
                boxShadow: draftColor === c ? "0 0 0 2px var(--accent), 0 0 0 4px var(--bg)" : "var(--shadow-sm)",
                transform: "none", cursor: "pointer"
              }}
              title={c} />

            )}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>⌘ + Enter</span>
          <button className="btn btn-sm btn-primary" onClick={addNote}><Icon name="plus" size={12} />메모 추가</button>
        </div>
      </div>

      {/* Color filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={`chip ${!colorFilter ? "chip-accent" : ""}`}
          style={{ cursor: "pointer", height: 26, padding: "0 10px", fontSize: 12 }}
          onClick={() => setColorFilter(null)}
        >전체 <span style={{ fontSize: 11, opacity: 0.7 }}>{notes.length}</span></button>
        {colors.map(c => {
          const cnt = notes.filter(n => n.color === c).length;
          if (!cnt) return null;
          return (
            <button
              key={c}
              className={`chip ${colorFilter === c ? "chip-accent" : ""}`}
              style={{ cursor: "pointer", height: 26, padding: "0 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setColorFilter(colorFilter === c ? null : c)}
            >
              <span className={`note-color-swatch note-${c}`} style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }} />
              {cnt}
            </button>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          {notes.length === 0 ? (
            <>
              <Icon name="note" size={28} style={{ color: "var(--text-faint)", marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-lo)" }}>첫 메모를 작성해보세요</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>위 입력창에 생각을 적고 메모 추가를 눌러요</div>
            </>
          ) : (
            <>
              <Icon name="search" size={24} style={{ color: "var(--text-faint)", marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-lo)" }}>검색 결과가 없어요</div>
              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => { setSearch(""); setColorFilter(null); }}>필터 초기화</button>
            </>
          )}
        </div>
      )}

      {view === "board" ?
      <div className="board" ref={boardRef} style={{ height: boardH, touchAction: "none" }}>
          {filteredNotes.map((n) => {
        const isEditing = editing && editing.id === n.id;
        const displayColor = isEditing ? editing.color : n.color;
        return (
        <div
          key={n.id}
          className={`note note-${displayColor} ${n.dragging ? "dragging" : ""} ${isEditing ? "is-editing" : ""}`}
          style={{
            left: n.x, top: n.y,
            transform: isEditing ? "rotate(0deg) scale(1.06)" : `rotate(${n.dragging ? 0 : n.rot}deg)${n.dragging ? " scale(1.04)" : ""}`,
            zIndex: isEditing ? 20 : (n.dragging ? 10 : "auto"),
            touchAction: "none",
            cursor: isEditing ? "default" : undefined,
          }}
          onPointerDown={(e) => onPointerDown(e, n)}
          onDoubleClick={() => !isEditing && startEdit(n)}
        >
              {isEditing ? (
                <textarea
                  ref={editAreaRef}
                  className="note-edit-area"
                  value={editing.text}
                  maxLength={1500}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                  }}
                  onBlur={commitEdit}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="내용을 입력하세요…"
                />
              ) : (
                <div className="note-text">{n.text}</div>
              )}

              <NoteToolbar
                note={n}
                isEditing={isEditing}
                editing={editing}
                setEditing={setEditing}
                onEdit={() => startEdit(n)}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                onCycleColor={() => cycleColor(n.id)}
                onDuplicate={() => duplicateNote(n)}
                onDelete={() => {
                  const deleted = n;
                  setNotes((prev) => prev.filter((x) => x.id !== n.id));
                  let undone = false;
                  window.Planary?.toast?.({
                    type: "ok", title: "포스트잇이 삭제됐어요",
                    actionLabel: "실행취소", action: () => { undone = true; setNotes((prev) => [...prev, deleted]); },
                    onExpire: () => { if (!undone) window.dispatchEvent(new CustomEvent("planary:delete-note", { detail: deleted.id })); },
                    ttl: 4000,
                  });
                }}
              />

              {!isEditing && (
                <div className="note-foot">
                  <span>{n.date}</span>
                </div>
              )}
            </div>);
        })}
        </div> :

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filteredNotes.map((n) => {
            const isEditing = editing && editing.id === n.id;
            const displayColor = isEditing ? editing.color : n.color;
            return (
        <div
          key={n.id}
          className={`note note-${displayColor} ${isEditing ? "is-editing" : ""}`}
          style={{
            position: "relative",
            width: "auto",
            left: 0, top: 0,
            transform: "rotate(-0.5deg)",
            minHeight: 140,
            cursor: isEditing ? "default" : "default"
          }}
          onDoubleClick={() => !isEditing && startEdit(n)}
        >
              {isEditing ? (
                <textarea
                  ref={editAreaRef}
                  className="note-edit-area"
                  value={editing.text}
                  maxLength={1500}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                  }}
                  onBlur={commitEdit}
                  placeholder="내용을 입력하세요…"
                />
              ) : (
                <div className="note-text">{n.text}</div>
              )}

              <NoteToolbar
                note={n}
                isEditing={isEditing}
                editing={editing}
                setEditing={setEditing}
                onEdit={() => startEdit(n)}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                onCycleColor={() => cycleColor(n.id)}
                onDuplicate={() => duplicateNote(n)}
                onDelete={() => {
                  const deleted = n;
                  setNotes((prev) => prev.filter((x) => x.id !== n.id));
                  let undone = false;
                  window.Planary?.toast?.({
                    type: "ok", title: "포스트잇이 삭제됐어요",
                    actionLabel: "실행취소", action: () => { undone = true; setNotes((prev) => [...prev, deleted]); },
                    onExpire: () => { if (!undone) window.dispatchEvent(new CustomEvent("planary:delete-note", { detail: deleted.id })); },
                    ttl: 4000,
                  });
                }}
              />

              {!isEditing && (
                <div className="note-foot">
                  <span>{n.date}</span>
                </div>
              )}
            </div>);
          })}
        </div>
      }
    </div>);

}

/* ---------- Note Toolbar (hover/edit actions) ---------- */
function NoteToolbar({ note, isEditing, editing, setEditing, onEdit, onCommit, onCancel, onCycleColor, onDuplicate, onDelete }) {
  if (isEditing) {
    const COLORS = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];
    return (
      <div className="note-toolbar is-editing" onPointerDown={(e) => e.stopPropagation()}>
        <div className="note-color-strip">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              className={`note-color-swatch note-${c} ${editing.color === c ? "is-on" : ""}`}
              onClick={() => setEditing({ ...editing, color: c })}
              onMouseDown={(e) => e.preventDefault()}
            />
          ))}
        </div>
        <div className="note-edit-actions">
          <button
            type="button"
            className="note-edit-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancel}
            title="취소 (Esc)"
          >취소</button>
          <button
            type="button"
            className="note-edit-btn is-primary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCommit}
            title="저장 (⌘+Enter)"
          >저장</button>
        </div>
      </div>
    );
  }
  return (
    <div className="note-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="note-icon-btn" onClick={onEdit} title="편집 (더블클릭)">
        <Icon name="edit" size={11} />
      </button>
      <button type="button" className="note-icon-btn" onClick={onCycleColor} title="색상 바꾸기">
        <Icon name="sparkles" size={11} />
      </button>
      <button type="button" className="note-icon-btn" onClick={onDuplicate} title="복제">
        <Icon name="copy" size={11} />
      </button>
      <button type="button" className="note-icon-btn is-danger" onClick={onDelete} title="삭제">
        <Icon name="trash" size={11} />
      </button>
    </div>
  );
}


window.Planary = Object.assign(window.Planary || {}, { NotesPage });
