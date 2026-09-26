// Wiki page screen; shared state hook aliases are initialized by pages-rest.jsx.
/* ===========================================================
   WIKI
   =========================================================== */
function WikiPage() {
  const [tree, setTree] = useStateO(() => [...(window.Planary.WIKI_TREE || [])]);
  const [activeId, setActiveId] = useStateO(() => window.Planary.WIKI_TREE?.[0]?.id || "");
  const [docBlocks, setDocBlocks] = useStateO([]); // sync from <WikiBlocks/>
  const [pendingDelete, setPendingDelete] = useStateO(null); // node being confirmed for deletion
  const [treeMenuFor, setTreeMenuFor] = useStateO(null); // node id whose ··· menu is open
  const [renamingId, setRenamingId] = useStateO(null); // node id being renamed inline
  const [renameDraft, setRenameDraft] = useStateO("");
  const renameInputRef = useRefO(null);
  const [duplicating, setDuplicating] = useStateO(null); // { node } | null
  const [addMenuFor, setAddMenuFor] = useStateO(null); // node id whose + add menu is open
  const [addMenuPos, setAddMenuPos] = useStateO({ top: 0, right: 0 });
  const [treeMenuPos, setTreeMenuPos] = useStateO({ top: 0, right: 0 });

  // Close tree/add popovers when clicking outside them
  useEffectO(() => {
    if (!addMenuFor && !treeMenuFor) return;
    const handler = (e) => {
      if (!e.target.closest(".popover") && !e.target.closest(".wiki-tree-action-btn")) {
        setAddMenuFor(null);
        setTreeMenuFor(null);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [addMenuFor, treeMenuFor]);
  // Drag-and-drop reordering
  const [dragId, setDragId] = useStateO(null);
  const [dropTarget, setDropTarget] = useStateO(null); // { id, pos: "before"|"after"|"inside" }
  const [showAside, setShowAside] = useStateO(() => typeof window !== 'undefined' && window.innerWidth > 1280);
  const [showTree, setShowTree] = useStateO(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [pageIcons, setPageIcons] = useStateO({});
  const [expanded, setExpanded] = useStateO({ w1: true, w2: true, w5: false, w7: false }); // tree open state
  const [search, setSearch] = useStateO("");
  const [shareOpen, setShareOpen] = useStateO(false);
  const [coverPanelOpen, setCoverPanelOpen] = useStateO(false);
  const [coverMenuOpen, setCoverMenuOpen] = useStateO(false);
  const [coverImage, setCoverImage] = useStateO(null); // url | null
  const [coverPosX, setCoverPosX] = useStateO(50); // 0-100
  const [coverPosY, setCoverPosY] = useStateO(50);
  const [coverHeight, setCoverHeight] = useStateO(180); // 120-360
  const [coverZoom, setCoverZoom] = useStateO(100); // 100-220
  const coverSaveTimerRef = useRefO(null);
  const coverLoadingRef = useRefO(false); // true while syncing from Firestore
  const fileInputRef = useRefO(null);
  const docScrollRef = useRefO(null);
  const [favorite, setFavorite] = useStateO(false);
  const [moreMenuOpen, setMoreMenuOpen] = useStateO(false);
  const [historyOpen, setHistoryOpen] = useStateO(false);
  const [infoOpen, setInfoOpen] = useStateO(false);
  const [favorites, setFavorites] = useStateO(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("planary.sidebar.favorites") || "[]");
      return new Set(stored.filter(f => f.wikiId).map(f => f.wikiId));
    } catch (_) { return new Set(); }
  });
  const [exportMenuOpen, setExportMenuOpen] = useStateO(false);
  const [importOpen, setImportOpen] = useStateO(false);
  const [pageSwitching, setPageSwitching] = useStateO(false);
  const activeIdRef = useRefO(activeId);
  const pageSwitchTimerRef = useRefO(null);
  const pageIndex = useMemoO(() => {
    const byId = new Map();
    const childrenByParent = new Map();
    for (const page of tree) {
      byId.set(page.id, page);
      const parent = page.parent || null;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent).push(page);
    }
    return { byId, childrenByParent };
  }, [tree]);
  const active = pageIndex.byId.get(activeId) || tree[0] || { id: "", title: "", icon: "📄", tags: [], parent: null };
  const activeIcon = pageIcons[activeId] !== undefined ? pageIcons[activeId] : active.icon;
  const [tagInputOpen, setTagInputOpen] = useStateO(false);
  const [tagDraft, setTagDraft] = useStateO("");
  const [titleDraft, setTitleDraft] = useStateO("");
  const tagInputRef = useRefO(null);
  const titleInputRef = useRefO(null);
  const setActiveIcon = (v) => {
    setPageIcons(prev => ({ ...prev, [activeId]: v }));
    setTree(prev => prev.map(w => w.id === activeId ? { ...w, icon: v } : w));
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { icon: v } },
    }));
  };
  useEffectO(() => { activeIdRef.current = activeId; }, [activeId]);
  const selectWikiPage = React.useCallback((id) => {
    if (!id || id === activeIdRef.current) return;
    activeIdRef.current = id;
    const cachedBlocks = window.Planary.WIKI_PAGES?.[id]?.blocks;
    if (Array.isArray(cachedBlocks)) setDocBlocks(cachedBlocks);
    setPageSwitching(true);
    setActiveId(id);
    setTreeMenuFor(null);
    setAddMenuFor(null);
    setMoreMenuOpen(false);
    setCoverMenuOpen(false);
    setCoverPanelOpen(false);
    window.clearTimeout(pageSwitchTimerRef.current);
    pageSwitchTimerRef.current = window.setTimeout(() => setPageSwitching(false), 120);
  }, []);
  useEffectO(() => () => window.clearTimeout(pageSwitchTimerRef.current), []);
  const currentPageMeta = useMemoO(() => {
    const chain = [];
    let cur = active;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent ? pageIndex.byId.get(cur.parent) : null;
    }
    const headingText = docBlocks
      .filter((b) => /^h[1-3]$/.test(b.type || ""))
      .map((b) => String(b.content || "").replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
    const inferred = new Set([
      ...chain.slice(0, -1).map((w) => w.title),
      ...headingText.slice(0, 2),
      ...(Array.isArray(active.tags) ? active.tags : []),
    ]);
    return {
      section: chain.length > 1 ? chain[chain.length - 2].title : "워크스페이스",
      tags: [...inferred].filter(Boolean).slice(0, 4),
    };
  }, [activeId, tree, docBlocks]);
  useEffectO(() => {
    setTitleDraft(active.title || "");
    setTagInputOpen(false);
    setTagDraft("");
  }, [activeId, active.title]);

  // Sync cover state from Firestore data when active page changes.
  // For local file covers (data: URLs too large for Firestore), fall back to localStorage.
  useEffectO(() => {
    coverLoadingRef.current = true;
    let coverVal = active.cover || null;
    if (!coverVal && activeId) {
      try { coverVal = localStorage.getItem(`planary.wiki-cover.${activeId}`) || null; } catch (_) {}
    }
    setCoverImage(coverVal);
    setCoverPosX(active.coverPosX ?? 50);
    setCoverPosY(active.coverPosY ?? 50);
    setCoverHeight(active.coverHeight ?? 180);
    setCoverZoom(active.coverZoom ?? 100);
    requestAnimationFrame(() => { coverLoadingRef.current = false; });
  }, [activeId]);

  // Save cover position/size slider changes (debounced)
  useEffectO(() => {
    if (coverLoadingRef.current || !activeId) return;
    clearTimeout(coverSaveTimerRef.current);
    coverSaveTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
        detail: { id: activeId, patch: {
          coverPositionX: coverPosX,
          coverPosition: coverPosY,
          coverHeight,
          coverZoom,
        }},
      }));
    }, 400);
    return () => clearTimeout(coverSaveTimerRef.current);
  }, [coverPosX, coverPosY, coverHeight, coverZoom]);

  useEffectO(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);
  const commitTitle = () => {
    const title = titleDraft.trim() || "제목 없음";
    if (title === active.title) return;
    setTree((prev) => prev.map((w) => w.id === activeId ? { ...w, title } : w));
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { title } },
    }));
  };
  const addPageTag = (value = tagDraft) => {
    const tag = value && value.trim().replace(/^#/, "");
    if (!tag) return;
    const nextTags = [...new Set([...(Array.isArray(active.tags) ? active.tags : []), tag])];
    setTree((prev) => prev.map((w) => w.id === activeId ? { ...w, tags: nextTags } : w));
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { tags: nextTags } },
    }));
    setTagDraft("");
    setTagInputOpen(false);
  };

  const COVER_GALLERY = [
  { id: "g1", label: "Violet wash", style: { background: "linear-gradient(135deg, #7f0df2, #9b3ff7)" } },
  { id: "g2", label: "Indigo dawn", style: { background: "linear-gradient(135deg, #3b82f6, #7f0df2)" } },
  { id: "g3", label: "Emerald calm", style: { background: "linear-gradient(135deg, #047857, #10b981)" } },
  { id: "g4", label: "Sunset", style: { background: "linear-gradient(135deg, #f59e0b, #e11d48)" } },
  { id: "g5", label: "Slate", style: { background: "linear-gradient(135deg, #1e293b, #475569)" } },
  { id: "g6", label: "Sky", style: { background: "linear-gradient(135deg, #60a5fa, #34d399)" } }];


  const saveCoverUrl = (url) => {
    if (!activeId) return;
    // data: URLs can be multi-MB — save to localStorage only to stay under Firestore 1MB limit
    if (url && url.includes("data:")) {
      try {
        if (url) localStorage.setItem(`planary.wiki-cover.${activeId}`, url);
        else localStorage.removeItem(`planary.wiki-cover.${activeId}`);
      } catch (_) {}
      return;
    }
    // For null (remove), clear localStorage cache too
    if (!url) {
      try { localStorage.removeItem(`planary.wiki-cover.${activeId}`); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { coverUrl: url } },
    }));
  };

  const handleFilePick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const cssUrl = `url("${reader.result}")`;
      setCoverImage(cssUrl);
      setCoverMenuOpen(false);
      saveCoverUrl(cssUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddByUrl = () => {
    const url = window.prompt("이미지 URL을 입력하세요", "");
    if (!url) return;
    const cssUrl = `url("${url.replace(/"/g, '\\"')}")`;
    setCoverImage(cssUrl);
    setCoverMenuOpen(false);
    saveCoverUrl(cssUrl);
  };

  const handlePickGallery = (g) => {
    setCoverImage(g.style.background);
    setCoverMenuOpen(false);
    saveCoverUrl(g.style.background);
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setCoverPanelOpen(false);
    saveCoverUrl(null);
  };

  // Build tree: roots and children
  const roots = pageIndex.childrenByParent.get(null) || [];
  const childrenOf = (id) => pageIndex.childrenByParent.get(id) || [];

  const toggleNode = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const matchSearch = (w) => !search || w.title.toLowerCase().includes(search.toLowerCase());

  // Sync tree → global on every change so other parts of the app see updates
  useEffectO(() => {
    window.Planary.WIKI_TREE = tree;
  }, [tree]);

  // Live-sync wiki tree from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      const d = e.detail || {};
      if (Array.isArray(d.tree)) {
        setTree(d.tree);
        setActiveId((cur) => d.tree.some((w) => w.id === cur) ? cur : (d.tree[0]?.id || ""));
      }
    };
    window.addEventListener("planary:wiki-loaded", onLoaded);
    const onOpenPage = (e) => { if (e.detail) selectWikiPage(e.detail); };
    window.addEventListener("planary:open-wiki-page", onOpenPage);
    return () => {
      window.removeEventListener("planary:wiki-loaded", onLoaded);
      window.removeEventListener("planary:open-wiki-page", onOpenPage);
    };
  }, []);

  // Scroll doc area to top on page change
  useEffectO(() => {
    if (docScrollRef.current) docScrollRef.current.scrollTop = 0;
  }, [activeId]);

  // Collect a page and all its descendants
  const collectDescendants = (id) => {
    const result = [id];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      childrenOf(cur).forEach((w) => {
        result.push(w.id);
        stack.push(w.id);
      });
    }
    return result;
  };

  const startRename = (node) => {
    setRenameDraft(node.title);
    setRenamingId(node.id);
    setTreeMenuFor(null);
  };

  // Add a new page (called from + button menu)
  const addPage = (parent, type) => {
    const id = `w${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const presets = {
      blank:    { icon: "📄", title: "새 페이지" },
      meeting:  { icon: "🗓️", title: "회의록", body: "헤더에 일시·참석자, 본문에 안건·결정·액션 아이템" },
      research: { icon: "🔬", title: "리서치 노트", body: "가설 · 방법 · 결과 · 다음 단계" },
      okr:      { icon: "🎯", title: "OKR & 마일스톤", body: "분기 목표와 핵심 결과" },
    };
    const preset = presets[type] || presets.blank;
    const newNode = { id, title: preset.title, icon: preset.icon, parent: parent || null, tags: [], orderIndex: Date.now() };
    setTree((prev) => [...prev, newNode]);
    if (parent) setExpanded((prev) => ({ ...prev, [parent]: true }));
    setActiveId(id);
    // Auto enter rename for the new page
    setTimeout(() => startRename(newNode), 80);
    window.dispatchEvent(new CustomEvent("planary:create-wiki-page", {
      detail: { clientId: id, title: preset.title, parentId: parent || null },
    }));
    window.Planary.toast?.({ type: "ok", title: "새 페이지가 추가됐어요", ttl: 1800 });
  };

  const commitRename = () => {
    if (!renamingId) return;
    const v = renameDraft.trim();
    if (v) {
      setTree((prev) => prev.map((w) => w.id === renamingId ? { ...w, title: v } : w));
      window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
        detail: { id: renamingId, patch: { title: v } },
      }));
      window.Planary.toast?.({ type: "ok", title: "이름이 변경됐어요", ttl: 1800 });
    }
    setRenamingId(null);
    setRenameDraft("");
  };
  const cancelRename = () => { setRenamingId(null); setRenameDraft(""); };

  // Focus the input when inline rename starts
  useEffectO(() => {
    if (renamingId && renameInputRef.current) {
      const el = renameInputRef.current;
      el.focus();
      el.select();
    }
  }, [renamingId]);
  const executeDelete = () => {
    if (!pendingDelete) return;
    const idsToRemove = new Set(collectDescendants(pendingDelete.id));
    idsToRemove.forEach((wid) => {
      window.dispatchEvent(new CustomEvent("planary:delete-wiki-page", { detail: wid }));
    });
    setTree((prev) => prev.filter((w) => !idsToRemove.has(w.id)));
    if (idsToRemove.has(activeId)) {
      const survivors = tree.filter((w) => !idsToRemove.has(w.id));
      const first = survivors.find((w) => !w.parent) || survivors[0];
      if (first) setActiveId(first.id);
    }
    window.Planary.toast?.({
      type: "ok",
      title: `"${pendingDelete.title}" 삭제됨`,
      sub: idsToRemove.size > 1 ? `${idsToRemove.size}개 페이지가 함께 삭제됐어요` : undefined,
    });
    setPendingDelete(null);
  };

  // Drag-and-drop reorder/reparent helpers
  const isDescendantOf = (ancestorId, candidateId) => {
    if (ancestorId === candidateId) return true;
    let cur = pageIndex.byId.get(candidateId);
    while (cur && cur.parent) {
      if (cur.parent === ancestorId) return true;
      cur = pageIndex.byId.get(cur.parent);
    }
    return false;
  };

  const moveNode = (sourceId, targetId, position) => {
    if (sourceId === targetId) return;
    if (isDescendantOf(sourceId, targetId)) {
      window.Planary.toast?.({ type: "err", title: "하위 페이지로 이동할 수 없어요" });
      return;
    }
    setTree((prev) => {
      const src = prev.find((w) => w.id === sourceId);
      const tgt = prev.find((w) => w.id === targetId);
      if (!src || !tgt) return prev;
      const without = prev.filter((w) => w.id !== sourceId);
      let newParent = position === "inside" ? targetId : (tgt.parent || null);
      const newSrc = { ...src, parent: newParent };
      const out = [];
      let inserted = false;
      if (position === "inside") {
        // place at end
        out.push(...without, newSrc);
        inserted = true;
      } else {
        const anchor = position === "before" ? "before" : "after";
        for (const w of without) {
          if (anchor === "before" && w.id === targetId && !inserted) {
            out.push(newSrc); inserted = true;
          }
          out.push(w);
          if (anchor === "after" && w.id === targetId && !inserted) {
            out.push(newSrc); inserted = true;
          }
        }
        if (!inserted) out.push(newSrc);
      }
      return out;
    });
    if (position === "inside") {
      setExpanded((prev) => ({ ...prev, [targetId]: true }));
    }
    window.Planary.toast?.({ type: "ok", title: "페이지가 이동됐어요", ttl: 1800 });
  };

  const TreeNode = ({ node, depth = 0 }) => {
    const kids = childrenOf(node.id);
    const hasKids = kids.length > 0;
    const isOpen = !!expanded[node.id];
    // Auto-expand if any descendant matches search
    const expandedBySearch = search && (matchSearch(node) || tree.some((w) => w.parent === node.id && matchSearch(w)));
    const open = isOpen || expandedBySearch;
    const isDragSource = dragId === node.id;
    const dropPos = dropTarget && dropTarget.id === node.id ? dropTarget.pos : null;
    const isMenuOpen = treeMenuFor === node.id;

    if (search && !matchSearch(node) && !kids.some((k) => matchSearch(k))) return null;

    const onDragStartEvt = (e) => {
      setDragId(node.id);
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", node.id); } catch (_) {}
    };

    const onDragOverEvt = (e) => {
      if (!dragId || dragId === node.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const h = rect.height;
      let pos;
      if (y < h * 0.25) pos = "before";
      else if (y > h * 0.75) pos = "after";
      else pos = "inside";
      setDropTarget({ id: node.id, pos });
    };

    const onDragLeaveEvt = (e) => {
      // Only clear if leaving the row entirely
      if (!e.currentTarget.contains(e.relatedTarget)) {
        if (dropTarget && dropTarget.id === node.id) setDropTarget(null);
      }
    };

    const onDropEvt = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragId && dragId !== node.id && dropTarget && dropTarget.id === node.id) {
        moveNode(dragId, node.id, dropTarget.pos);
      }
      setDragId(null);
      setDropTarget(null);
    };

    const onDragEndEvt = () => { setDragId(null); setDropTarget(null); };

    return (
      <div>
        <div
          className={`wiki-tree-item ${activeId === node.id ? "is-active" : ""} ${isDragSource ? "is-drag-src" : ""} ${dropPos ? `drop-${dropPos}` : ""}`}
          style={{ paddingLeft: 6 + depth * 14 }}
          onPointerDown={(e) => {
            if (e.button !== 0 || renamingId === node.id) return;
            selectWikiPage(node.id);
          }}
          onClick={() => selectWikiPage(node.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectWikiPage(node.id);
            }
          }}
          role="button"
          tabIndex={0}
          draggable
          onDragStart={onDragStartEvt}
          onDragOver={onDragOverEvt}
          onDragLeave={onDragLeaveEvt}
          onDrop={onDropEvt}
          onDragEnd={onDragEndEvt}
        >

          {hasKids ?
          <button
            className={`wiki-tree-toggle ${open ? "is-open" : ""}`}
            onClick={(e) => {e.stopPropagation();toggleNode(node.id);}}
            title={open ? "접기" : "펼치기"}>

              <Icon name="chevronRight" size={11} />
            </button> :

          <span style={{ width: 18, display: "inline-block" }} />
          }
          <span style={{ fontSize: 14 }}>{node.icon}</span>
          {renamingId === node.id ? (
            <input
              ref={renameInputRef}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelRename();
              }}
              onBlur={commitRename}
              className="wiki-tree-rename-input"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <span
              style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              onDoubleClick={(e) => { e.stopPropagation(); startRename(node); }}
              title="더블클릭으로 이름 변경"
            >
              {node.title}
            </span>
          )}

          <div className="wiki-tree-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wiki-tree-action-btn"
              title="페이지 추가"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setAddMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                setAddMenuFor(addMenuFor === node.id ? null : node.id);
                setTreeMenuFor(null);
              }}
            >
              <Icon name="plus" size={11} />
            </button>
            <button
              type="button"
              className="wiki-tree-action-btn"
              title="더 보기"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setTreeMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                setTreeMenuFor(isMenuOpen ? null : node.id);
                setAddMenuFor(null);
              }}
            >
              <Icon name="more" size={12} />
            </button>
          </div>

          {hasKids && !isMenuOpen && addMenuFor !== node.id &&
          <span style={{ fontSize: 10, color: "var(--text-faint)" }} className="wiki-tree-count">
              {kids.length}
            </span>
          }

          {addMenuFor === node.id && (
            <div
              className="popover"
              style={{ position: "fixed", top: addMenuPos.top, right: addMenuPos.right, zIndex: 300, minWidth: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popover-header" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", padding: "6px 10px 4px" }}>
                {node.title} 안에 추가
              </div>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "blank"); setAddMenuFor(null); }}>
                <Icon name="document" size={12} />
                <div style={{ flex: 1 }}>
                  <div>빈 페이지</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>제목 없이 새로 시작</div>
                </div>
              </button>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "meeting"); setAddMenuFor(null); }}>
                <Icon name="calendar" size={12} />
                <div style={{ flex: 1 }}>
                  <div>회의록</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>일시·안건·결정 템플릿</div>
                </div>
              </button>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "research"); setAddMenuFor(null); }}>
                <Icon name="sparkles" size={12} />
                <div style={{ flex: 1 }}>
                  <div>리서치 노트</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>가설·방법·결과 템플릿</div>
                </div>
              </button>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "okr"); setAddMenuFor(null); }}>
                <Icon name="target" size={12} />
                <div style={{ flex: 1 }}>
                  <div>OKR & 마일스톤</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>분기 목표 템플릿</div>
                </div>
              </button>
              <div className="popover-sep" />
              <button type="button" className="popover-item" onClick={() => { addPage(node.parent, "blank"); setAddMenuFor(null); }}>
                <Icon name="arrowRight" size={12} style={{ transform: "rotate(-90deg)" }} />
                <span>같은 레벨에 추가</span>
              </button>
            </div>
          )}

          {isMenuOpen && (
            <div
              className="popover"
              style={{ position: "fixed", top: treeMenuPos.top, right: treeMenuPos.right, zIndex: 300, minWidth: 160 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popover-item" onClick={() => { selectWikiPage(node.id); setTreeMenuFor(null); }}>
                <Icon name="eye" size={12} />열기
              </div>
              <div className="popover-item" onClick={() => { addPage(node.id, "blank"); setTreeMenuFor(null); }}>
                <Icon name="document" size={12} />하위 페이지 추가
              </div>
              <div className="popover-item" onClick={() => startRename(node)}>
                <Icon name="edit" size={12} />이름 변경
              </div>
              <div className="popover-item" onClick={() => { setDuplicating({ node }); setTreeMenuFor(null); }}>
                <Icon name="copy" size={12} />복제
              </div>
              <div className="popover-sep" />
              <div
                className="popover-item is-danger"
                onClick={() => { setPendingDelete(node); setTreeMenuFor(null); }}
              >
                <Icon name="trash" size={12} />삭제
              </div>
            </div>
          )}
        </div>
        {hasKids &&
        <div
          className={`wiki-tree-children ${open ? "is-open" : "is-closed"}`}
          style={{ maxHeight: open ? `${kids.length * 80}px` : 0 }}>

            {kids.map((k) => <TreeNode key={k.id} node={k} depth={depth + 1} />)}
          </div>
        }
      </div>);

  };

  if (tree.length === 0) {
    return (
      <div className="page-wide">
        <div className="wiki-empty">
          <div className="wiki-empty-icon" aria-hidden="true">📝</div>
          <h2 className="wiki-empty-title">노트를 추가하세요!</h2>
          <p className="wiki-empty-sub">아직 페이지가 없어요. 첫 번째 노트를 만들어 시작해 보세요.</p>
          <button
            className="btn btn-primary"
            onClick={() => addPage(null, "blank")}
            type="button"
          >
            <Icon name="plus" size={14} />새 페이지 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div className="wiki-shell" data-tree={showTree ? "open" : "closed"} data-aside={showAside ? "open" : "closed"}>
        {(showTree || showAside) && (
          <div
            className={`wiki-drawer-scrim ${(showTree || showAside) ? "is-open" : ""}`}
            onClick={() => { setShowTree(false); setShowAside(false); }}
          />
        )}
        {showTree && <aside className="wiki-tree">
          <button className="wiki-drawer-close" onClick={() => setShowTree(false)} aria-label="페이지 목록 닫기">
            <Icon name="x" size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 10px", borderBottom: "1px solid var(--border-soft)", marginBottom: 6 }}>
            <Icon name="search" size={12} style={{ color: "var(--text-lo)" }} />
            <input
              placeholder="페이지 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 13, color: "var(--text-hi)" }} />
            
            {search ?
            <button className="icon-btn" onClick={() => setSearch("")} style={{ width: 18, height: 18 }}>
                <Icon name="x" size={10} />
              </button> :

            <span className="kbd">/</span>
            }
          </div>
          <div>
            {roots.map((r) => <TreeNode key={r.id} node={r} />)}
          </div>
          <button
            className="wiki-tree-item wiki-tree-add"
            type="button"
            onClick={() => addPage(null, "blank")}
            style={{ color: "var(--text-lo)", marginTop: 4, width: "100%" }}>
            <span style={{ width: 18, display: "inline-block" }} />
            <Icon name="plus" size={12} />
            <span>새 페이지</span>
          </button>
        </aside>}

        <div className={`wiki-doc ${pageSwitching ? "is-switching" : ""}`} ref={docScrollRef}>
          <div
            className={`wiki-cover ${coverPanelOpen ? "is-editing" : ""}`}
            style={{ height: coverHeight, "--cover-pos-x": `${coverPosX}%`, "--cover-pos-y": `${coverPosY}%`, "--cover-zoom": `${coverZoom}%` }}>
            
            {coverImage ?
            <div
              className="wiki-cover-canvas"
              style={{ background: coverImage, backgroundSize: `${coverZoom}% auto`, backgroundPosition: `${coverPosX}% ${coverPosY}%`, backgroundRepeat: "no-repeat" }} /> :


            <div className="wiki-cover-canvas" style={{ background: "var(--surface-2)", backgroundImage: "none" }} />
            }

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFilePick} />
            

            <div className="wiki-cover-controls">
              {coverImage ?
              <>
                  <button
                  className={`wiki-cover-pill ${coverMenuOpen ? "is-active" : ""}`}
                  onClick={() => {setCoverMenuOpen(!coverMenuOpen);setCoverPanelOpen(false);}}
                  type="button">
                  
                    <Icon name="image" size={11} />커버 변경
                  </button>
                  <button
                  className={`wiki-cover-pill ${coverPanelOpen ? "is-active" : ""}`}
                  onClick={() => {setCoverPanelOpen(!coverPanelOpen);setCoverMenuOpen(false);}}
                  type="button">
                  
                    <Icon name="settings" size={11} />위치 / 크기
                  </button>
                  <button
                  className="wiki-cover-pill"
                  onClick={handleRemoveCover}
                  type="button">
                  
                    <Icon name="x" size={11} />제거
                  </button>
                </> :

              <button
                className={`wiki-cover-pill ${coverMenuOpen ? "is-active" : ""}`}
                onClick={() => setCoverMenuOpen(!coverMenuOpen)}
                type="button">
                
                  <Icon name="plus" size={11} />커버 추가
                </button>
              }
            </div>

            {coverMenuOpen &&
            <div className="wiki-cover-panel" style={{ width: 280, top: 50 }}>
                <div className="kicker" style={{ marginBottom: 10 }}>커버 이미지</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  <button
                  className="popover-item"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  type="button">
                  
                    <Icon name="image" size={14} />
                    <div style={{ flex: 1 }}>
                      <div>로컬 파일 업로드</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>PNG · JPG · WebP · 5MB까지</div>
                    </div>
                  </button>
                  <button className="popover-item" onClick={handleAddByUrl} type="button">
                    <Icon name="link" size={14} />
                    <div style={{ flex: 1 }}>
                      <div>이미지 URL로 추가</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>외부 링크</div>
                    </div>
                  </button>
                </div>
                <div className="kicker" style={{ marginBottom: 8 }}>갤러리</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {COVER_GALLERY.map((g) =>
                <button
                  key={g.id}
                  onClick={() => handlePickGallery(g)}
                  type="button"
                  title={g.label}
                  style={{
                    height: 48,
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border-soft)",
                    cursor: "pointer",
                    ...g.style,
                    transition: "transform var(--dur-fast)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"} />

                )}
                </div>
              </div>
            }

            {coverPanelOpen && coverImage &&
            <div className="wiki-cover-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="kicker">위치 & 크기</div>
                  <button
                  className="icon-btn"
                  onClick={() => {setCoverPosX(50);setCoverPosY(50);setCoverHeight(180);setCoverZoom(100);}}
                  title="기본값으로 되돌리기">
                  
                    <Icon name="refresh" size={12} />
                  </button>
                </div>
                <div className="cover-slider-row">
                  <label>가로 위치 <span className="val">{coverPosX}%</span></label>
                  <input className="cover-slider" type="range" min="0" max="100" value={coverPosX} onChange={(e) => setCoverPosX(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverPosX: Number(e.target.value) })} />
                </div>
                <div className="cover-slider-row">
                  <label>세로 위치 <span className="val">{coverPosY}%</span></label>
                  <input className="cover-slider" type="range" min="0" max="100" value={coverPosY} onChange={(e) => setCoverPosY(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverPosY: Number(e.target.value) })} />
                </div>
                <div className="cover-slider-row">
                  <label>면적 (높이) <span className="val">{coverHeight}px</span></label>
                  <input className="cover-slider" type="range" min="120" max="360" value={coverHeight} onChange={(e) => setCoverHeight(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverHeight: Number(e.target.value) })} />
                </div>
                <div className="cover-slider-row">
                  <label>확대 <span className="val">{coverZoom}%</span></label>
                  <input className="cover-slider" type="range" min="100" max="220" value={coverZoom} onChange={(e) => setCoverZoom(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverZoom: Number(e.target.value) })} />
                </div>
                <button className="btn btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => setCoverPanelOpen(false)}>
                  완료
                </button>
              </div>
            }

            <div className="wiki-icon-host">
              <window.Planary.IconPicker
                value={activeIcon}
                onChange={setActiveIcon}
                size={64}
                color="var(--surface)"
              />
            </div>
          </div>
          <div className="wiki-doc-meta">
            <button
              className="btn btn-sm"
              onClick={() => setShowTree(s => !s)}
              title="페이지 목록"
              style={{ marginRight: 4 }}
            >
              <Icon name="menu" size={12} />페이지
            </button>
            {(() => {
              // Build ancestry chain from root to current page
              const chain = [];
              let cur = active;
              while (cur) {
                chain.unshift(cur);
                cur = cur.parent ? pageIndex.byId.get(cur.parent) : null;
              }
              return chain.map((node, i) => {
                const isLast = i === chain.length - 1;
                return (
                  <React.Fragment key={node.id}>
                    {i > 0 && <Icon name="chevronRight" size={11} />}
                    {isLast ? (
                      <span style={{ color: "var(--text-hi)", fontWeight: 600 }}>{node.title}</span>
                    ) : (
                      <button
                        className="wiki-crumb"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          selectWikiPage(node.id);
                        }}
                        onClick={() => selectWikiPage(node.id)}
                        title={`${node.title}(으)로 이동`}
                      >
                        <span className="wiki-crumb-icon">{node.icon}</span>
                        {node.title}
                      </button>
                    )}
                  </React.Fragment>
                );
              });
            })()}
            <div style={{ flex: 1 }} />
            <button
              className={`btn btn-sm ${showAside ? "btn-ghost" : ""}`}
              onClick={() => setShowAside(s => !s)}
              title="목차"
              style={{ background: showAside ? "var(--accent-soft)" : undefined, color: showAside ? "var(--accent)" : undefined }}
            >
              <Icon name="list" size={12} />목차
            </button>
            <span className="chip"><Icon name="clock" size={10} />12분 전</span>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-sm btn-ghost"
                data-comment-anchor="03bfe54937-button-603-13"
                onClick={() => setShareOpen(true)}>
                
                <Icon name="share" size={12} />공유
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-sm"
                style={{ width: 28, padding: 0, justifyContent: "center" }}
                onClick={() => setMoreMenuOpen(o => !o)}
                title="페이지 작업"
              >
                <Icon name="more" size={14} />
              </button>
              {moreMenuOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 99 }}
                    onClick={() => setMoreMenuOpen(false)}
                  />
                  <div
                    className="popover"
                    style={{ top: "calc(100% + 6px)", right: 0, minWidth: 220, zIndex: 100 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ padding: "10px 12px 6px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 6, background: "var(--bg-elev)", display: "grid", placeItems: "center", fontSize: 16 }}>
                        {activeIcon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>마지막 수정 · 12분 전</div>
                      </div>
                    </div>
                    <div className="popover-sep" />
                    <div
                      className="popover-item"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        const next = new Set(favorites);
                        const isFav = favorites.has(activeId);
                        if (isFav) next.delete(activeId); else next.add(activeId);
                        setFavorites(next);
                        try {
                          const stored = JSON.parse(localStorage.getItem("planary.sidebar.favorites") || "[]");
                          const filtered = stored.filter(f => f.wikiId !== activeId);
                          if (!isFav) filtered.push({ id: `wiki_${activeId}`, name: active.title, target: "wiki", wikiId: activeId });
                          localStorage.setItem("planary.sidebar.favorites", JSON.stringify(filtered));
                          window.dispatchEvent(new Event("planary:favorites-changed"));
                        } catch (_) {}
                        window.Planary.toast?.({
                          type: "ok",
                          title: isFav ? "즐겨찾기에서 제거됨" : "즐겨찾기에 추가됨",
                          sub: active.title,
                        });
                      }}
                    >
                      <Icon name="star" size={14} style={favorites.has(activeId) ? { color: "var(--warn)", fill: "var(--warn)" } : undefined} />
                      <span style={{ flex: 1 }}>{favorites.has(activeId) ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}</span>
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); setDuplicating({ node: active }); }}>
                      <Icon name="copy" size={14} />페이지 복제
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); navigator.clipboard?.writeText(`https://planary.app/w/${active.id}`); window.Planary.toast?.({ type: "ok", title: "링크가 복사됐어요" }); }}>
                      <Icon name="link" size={14} />링크 복사
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); window.Planary.toast?.({ type: "info", title: "이동 패널을 열었어요" }); }}>
                      <Icon name="folder" size={14} />이동
                      <Icon name="chevronRight" size={11} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
                    </div>
                    <div className="popover-sep" />
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); setInfoOpen(true); }}>
                      <Icon name="document" size={14} />페이지 정보
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); setHistoryOpen(true); }}>
                      <Icon name="clock" size={14} />수정 이력
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-faint)" }}>12</span>
                    </div>
                    <div
                      className="popover-item"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setExportMenuOpen(true);
                      }}
                    >
                      <Icon name="download" size={14} />내보내기
                      <Icon name="chevronRight" size={11} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
                    </div>
                    <div
                      className="popover-item"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setImportOpen(true);
                      }}
                    >
                      <Icon name="inbox" size={14} />가져오기
                    </div>
                    <div className="popover-sep" />
                    <div
                      className="popover-item is-danger"
                      onClick={() => { setMoreMenuOpen(false); setPendingDelete(active); }}
                    >
                      <Icon name="trash" size={14} />페이지 삭제
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span className="chip chip-accent"><Icon name="book" size={10} />{currentPageMeta.section}</span>
            {currentPageMeta.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
            {tagInputOpen ? (
              <span className="wiki-tag-input-chip">
                <Icon name="hash" size={10} />
                <input
                  ref={tagInputRef}
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addPageTag();
                    if (e.key === "Escape") { setTagDraft(""); setTagInputOpen(false); }
                  }}
                  onBlur={() => { if (tagDraft.trim()) addPageTag(); else setTagInputOpen(false); }}
                  placeholder="태그"
                />
              </span>
            ) : (
              <button className="chip wiki-tag-add-btn" onClick={() => setTagInputOpen(true)}><Icon name="plus" size={10} />태그</button>
            )}
          </div>
          <input
            ref={titleInputRef}
            className="wiki-doc-title wiki-doc-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitTitle(); titleInputRef.current?.blur(); }
              if (e.key === "Escape") { setTitleDraft(active.title || ""); titleInputRef.current?.blur(); }
            }}
            placeholder="제목 없음"
          />

          <WikiBlocks key={activeId} activeId={activeId} onBlocksChange={setDocBlocks} />
        </div>

        {showAside &&
        <aside className="wiki-aside">
            <button className="wiki-drawer-close" onClick={() => setShowAside(false)} aria-label="목차 닫기">
              <Icon name="x" size={16} />
            </button>
            <div className="wiki-aside-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="kicker">목차</div>
                <button className="icon-btn" onClick={() => setShowAside(false)} title="목차 접기">
                  <Icon name="chevronRight" size={12} />
                </button>
              </div>
              <WikiTOC blocks={docBlocks} />
            </div>

            <div className="wiki-aside-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="kicker">관련 작업</div>
                <span
                  className="info-tip"
                  title="이 페이지의 태그 또는 같은 프로젝트의 작업을 모아 보여줘요"
                  style={{ fontSize: 11, color: "var(--text-faint)", cursor: "help" }}
                >
                  <Icon name="info" size={12} style={{ verticalAlign: -2 }} />
                </span>
              </div>
              <RelatedTasks activePage={active} />
            </div>

            <div className="wiki-aside-card">
              <div className="kicker" style={{ marginBottom: 10 }}>백링크</div>
              <Backlinks activePage={active} />
            </div>
          </aside>}
      </div>
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} title={active.title} />}
      {historyOpen && <VersionHistoryDialog onClose={() => setHistoryOpen(false)} page={active} onRestore={(blocks) => {
        window.dispatchEvent(new CustomEvent("planary:wiki-restore", { detail: { id: active.id, blocks } }));
      }} />}
      {infoOpen && <PageInfoDialog onClose={() => setInfoOpen(false)} page={active} favorites={favorites} />}
      {exportMenuOpen && <ExportDialog onClose={() => setExportMenuOpen(false)} page={active} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {duplicating && (
        <DuplicatePageDialog
          node={duplicating.node}
          tree={tree}
          collectDescendants={collectDescendants}
          onClose={() => setDuplicating(null)}
          onConfirm={(opts) => {
            // Create deep copy: new id for the source, and for each descendant if includeChildren
            const idMap = {};
            const newRoot = { ...duplicating.node, id: `w${Date.now()}${Math.random().toString(36).slice(2, 6)}`, title: opts.title };
            idMap[duplicating.node.id] = newRoot.id;
            const additions = [newRoot];
            if (opts.includeChildren) {
              const queue = [duplicating.node.id];
              while (queue.length) {
                const curId = queue.shift();
                childrenOf(curId).forEach((child) => {
                  const newId = `w${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
                  idMap[child.id] = newId;
                  additions.push({ ...child, id: newId, parent: idMap[child.parent] });
                  queue.push(child.id);
                });
              }
            }
            setTree((prev) => [...prev, ...additions]);
            if (duplicating.node.parent) setExpanded((prev) => ({ ...prev, [duplicating.node.parent]: true }));
            selectWikiPage(newRoot.id);
            window.Planary.toast?.({
              type: "ok",
              title: `"${opts.title}" 복제됨`,
              sub: additions.length > 1 ? `하위 페이지 ${additions.length - 1}개 포함` : undefined,
            });
            setDuplicating(null);
          }}
        />
      )}
      {pendingDelete && (
        <div className="dialog-scrim" onClick={() => setPendingDelete(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)" }}>
            <div className="dialog-head">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>페이지 삭제</h3>
                <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>이 작업은 되돌릴 수 없습니다</p>
              </div>
              <button className="icon-btn" onClick={() => setPendingDelete(null)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: "16px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--bg-elev)", borderRadius: "var(--r-md)" }}>
                <span style={{ fontSize: 28 }}>{pendingDelete.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pendingDelete.title}</div>
                  {(() => {
                    const childCount = collectDescendants(pendingDelete.id).length - 1;
                    return (
                      <div style={{ fontSize: 11, color: childCount > 0 ? "var(--err)" : "var(--text-lo)", marginTop: 2 }}>
                        {childCount > 0 ? `하위 페이지 ${childCount}개가 함께 삭제됩니다` : "하위 페이지 없음"}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="dialog-foot">
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm" onClick={() => setPendingDelete(null)}>취소</button>
              <button
                className="btn btn-sm btn-primary"
                style={{ background: "var(--err)" }}
                onClick={executeDelete}
              >
                <Icon name="trash" size={12} />삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);

}


window.Planary = Object.assign(window.Planary || {}, { WikiPage });
