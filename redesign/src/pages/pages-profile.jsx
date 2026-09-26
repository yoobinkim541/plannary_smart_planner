// Profile screen, preferences, and account connection cards.
// Uses the shared React hook aliases initialized by pages-rest.jsx.
/* ===========================================================
   WIDGET VISIBILITY MANAGER
   =========================================================== */
function WidgetVisibilityManager({ t, setTweak }) {
  const defs = window.Planary.WIDGET_DEFS || [];
  const variant = t?.variant || 'balanced';
  const visibleWidgets = window.Planary.computeVisibleWidgets
    ? window.Planary.computeVisibleWidgets(t?.interests || [], t?.widgetVisibility || null)
    : Object.fromEntries(defs.map(w => [w.id, true]));

  const variantDefs = defs.filter(w => w.variants.includes(variant));
  const otherDefs   = defs.filter(w => !w.variants.includes(variant));

  const toggle = (id) => {
    const next = { ...visibleWidgets, [id]: !visibleWidgets[id] };
    setTweak('widgetVisibility', next);
    window.Planary.toast({ type: 'ok', title: `위젯 ${next[id] ? '켜짐' : '꺼짐'}` });
  };

  const variantLabel = { balanced: 'balanced', conservative: 'conservative', bold: 'bold' }[variant] || variant;

  return (
    <>
      {variantDefs.map(w => (
        <ProfileRow key={w.id} label={w.label} sub={`현재 레이아웃(${variantLabel})에서 사용`}>
          <div className={`switch ${visibleWidgets[w.id] ? 'is-on' : ''}`} onClick={() => toggle(w.id)} />
        </ProfileRow>
      ))}
      {otherDefs.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', margin: '12px 0 4px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            다른 레이아웃
          </div>
          {otherDefs.map(w => (
            <ProfileRow key={w.id} label={w.label} sub={w.variants.join(', ') + ' 레이아웃에서 사용됨'}>
              <div className={`switch ${visibleWidgets[w.id] ? 'is-on' : ''}`} onClick={() => toggle(w.id)} />
            </ProfileRow>
          ))}
        </>
      )}
    </>
  );
}

/* ===========================================================
   PROFILE
   =========================================================== */
function ProfilePage({ tasks, t, setTweak }) {
  const { USER, PROJECTS } = window.Planary;
  const [user, setUser] = useStateO(USER);
  const [editOpen, setEditOpen] = useStateO(false);
  const [signOutOpen, setSignOutOpen] = useStateO(false);
  const [switchOpen, setSwitchOpen] = useStateO(false);
  const [sessionsOpen, setSessionsOpen] = useStateO(false);
  const [tfaOpen, setTfaOpen] = useStateO(false);
  const [openMenu, setOpenMenu] = useStateO(null); // "font" | "sidebar" | "density" | "lang" | null
  const [lang, setLangState] = useStateO(() => window.PlanaryI18n?.getLang?.() || "ko");
  const [notifs, setNotifs] = useStateO({ email: true, push: true, gcal: true, apple: false, slack: false });

  // Sync user doc from firebase-bridge
  useEffectO(() => {
    const onUserDoc = (e) => {
      const d = e.detail || {};
      setUser((prev) => ({
        ...prev,
        name: d.displayName || prev.name,
        email: d.email || prev.email,
        avatar: d.photoURL ? `url("${d.photoURL}")` : prev.avatar,
        initials: (d.displayName || prev.name || "U").slice(0, 1).toUpperCase(),
        school: d.school || prev.school || "",
        studentId: d.studentId || prev.studentId || "",
        bio: d.bio || prev.bio || "",
      }));
      if (d.notifPrefs && typeof d.notifPrefs === "object") {
        setNotifs((prev) => ({ ...prev, ...d.notifPrefs }));
      }
    };
    window.addEventListener("planary:user-doc-loaded", onUserDoc);
    return () => window.removeEventListener("planary:user-doc-loaded", onUserDoc);
  }, []);
  const done = tasks.filter((x) => x.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const isImage = user.avatar && typeof user.avatar === "string" && user.avatar.startsWith("url(");
  const theme = t ? t.theme : "dark";
  const setTheme = (v) => setTweak && setTweak("theme", v);
  const fontOpts = [
    { id: "nanum-gothic", label: "Nanum Gothic" },
    { id: "nanum-myeongjo", label: "Nanum Myeongjo" },
    { id: "jakarta", label: "Plus Jakarta Sans" },
    { id: "pretendard", label: "Pretendard" },
    { id: "inter", label: "Inter" }
  ];
  const sidebarOpts = [{ id: "full", label: "풀 너비" }, { id: "compact", label: "컴팩트" }, { id: "icons", label: "아이콘만" }];
  const densityOpts = [{ id: "compact", label: "촘촘하게" }, { id: "regular", label: "보통" }, { id: "comfortable", label: "여유롭게" }];
  const langOpts = [
    { id: "ko", label: "한국어", flag: "🇰🇷" },
    { id: "en", label: "English", flag: "🇺🇸" },
    { id: "ja", label: "日本語", flag: "🇯🇵" },
    { id: "zh", label: "中文", flag: "🇨🇳" },
    { id: "es", label: "Español", flag: "🇪🇸" },
  ];
  const fontLabel = (fontOpts.find((o) => o.id === (t && t.font)) || fontOpts[0]).label;
  const sidebarLabel = (sidebarOpts.find((o) => o.id === (t && t.sidebar)) || sidebarOpts[0]).label;
  const densityLabel = (densityOpts.find((o) => o.id === (t && t.density)) || densityOpts[1]).label;
  const saveProfile = (draft) => {
    setUser(draft);
    window.Planary.USER = { ...window.Planary.USER, ...draft };
    window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: window.Planary.USER }));
    setEditOpen(false);
    window.dispatchEvent(new CustomEvent("planary:update-profile", {
      detail: {
        name: draft.name || null,
        avatar: draft.avatar || null,
        school: draft.school || null,
        studentId: draft.studentId || null,
        bio: draft.bio || null,
      },
    }));
    window.Planary.toast({ type: "ok", title: "프로필이 업데이트됐어요" });
  };

  return (
    <div className="page-wide">
      <div className="page-head">
        <div className="kicker">WORKSPACE · 마이페이지</div>
        <div className="page-title">설정 & 통계</div>
        <div className="page-sub">개인 설정과 활동 요약</div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="profile-card">
            <div
              className="profile-avatar"
              style={{
                background: isImage ? `${user.avatar} center/cover no-repeat` : "var(--accent-soft)",
                color: "var(--accent)",
                boxShadow: "none"
              }}>
              
              {!isImage && user.initials}
            </div>
            <div className="profile-name-big">{user.name}</div>
            <div className="profile-email-md">{user.email}</div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {user.memberSince && <span className="chip"><Icon name="clock" size={10} />{user.memberSince}</span>}
            </div>
            {user.bio && <p style={{ fontSize: 12, color: "var(--text-md)", marginTop: 14, lineHeight: 1.5 }}>{user.bio}</p>}
            <button className="btn btn-ghost" style={{ marginTop: 16, width: "100%" }} onClick={() => setEditOpen(true)}>
              <Icon name="edit" size={12} />프로필 편집
            </button>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>이번 주 활동</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div className="ring" style={{ "--p": pct, "--size": "64px", "--stroke": "6px" }}>
                <span className="ring-text">{pct}%</span>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-lo)" }}>완료율</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{done}/{tasks.length} 작업</div>
              </div>
            </div>
            {[
            { label: "포스트잇", val: window.Planary.NOTES.length, icon: "note" },
            { label: "노트 페이지", val: window.Planary.WIKI_TREE.length, icon: "book" },
            { label: "북마크", val: window.Planary.BOOKMARKS.length, icon: "bookmark" },
            { label: "활성 프로젝트", val: PROJECTS.length, icon: "layers" }].
            map((s) =>
            <div key={s.label} className="field-row">
                <span className="field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={s.icon} size={14} style={{ color: "var(--text-lo)" }} />{s.label}
                </span>
                <span className="field-value" style={{ fontWeight: 700, color: "var(--text-hi)" }}>{s.val}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <EclassConnectionCard />

          <div className="card" style={{ padding: 0, marginTop: 12 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>외관</h3>
              <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>테마와 글꼴, 사이드바 형태를 바꿔보세요</p>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              <ProfileRow label="테마" sub={theme === "dark" ? "다크 모드" : "라이트 모드"}>
                <button className="btn btn-sm btn-ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  <Icon name={theme === "dark" ? "sun" : "moon"} size={12} />{theme === "dark" ? "라이트로" : "다크로"}
                </button>
              </ProfileRow>
              <ProfileDropdownRow label="글꼴" value={fontLabel} options={fontOpts} selected={t && t.font}
              onSelect={(v) => setTweak("font", v)} open={openMenu === "font"}
              onOpen={() => setOpenMenu("font")} onClose={() => setOpenMenu(null)} />
              <ProfileDropdownRow label="사이드바" value={sidebarLabel} options={sidebarOpts} selected={t && t.sidebar}
              onSelect={(v) => setTweak("sidebar", v)} open={openMenu === "sidebar"}
              onOpen={() => setOpenMenu("sidebar")} onClose={() => setOpenMenu(null)} />
              <ProfileDropdownRow label="정보 밀도" value={densityLabel} options={densityOpts} selected={t && t.density}
              onSelect={(v) => setTweak("density", v)} open={openMenu === "density"}
              onOpen={() => setOpenMenu("density")} onClose={() => setOpenMenu(null)} />
              <ProfileDropdownRow
                label="언어 / Language"
                value={(langOpts.find(o => o.id === lang) || langOpts[0]).flag + " " + (langOpts.find(o => o.id === lang) || langOpts[0]).label}
                options={langOpts.map(o => ({ id: o.id, label: `${o.flag}  ${o.label}` }))}
                selected={lang}
                onSelect={(v) => {
                  setLangState(v);
                  window.PlanaryI18n?.setLang?.(v);
                  window.dispatchEvent(new CustomEvent("planary:save-preferences", { detail: { lang: v } }));
                  const msg = window.PlanaryI18n?.t?.("toast.langChanged") || "Language changed";
                  window.Planary.toast({ type: "ok", title: msg });
                }}
                open={openMenu === "lang"}
                onOpen={() => setOpenMenu("lang")}
                onClose={() => setOpenMenu(null)} />
              <ProfileRow label="키보드 단축키" sub="⌘K · ⌘N · / 등">
                <span className="chip chip-ok"><Icon name="check" size={9} stroke={3} />활성</span>
              </ProfileRow>
              <ProfileRow label="온보딩 다시 보기" sub="Planary 시작 가이드를 다시 실행합니다">
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    try { localStorage.removeItem("planary.onboarding.done"); } catch (_) {}
                    window.dispatchEvent(new CustomEvent("planary:open-onboarding"));
                  }}
                >
                  <Icon name="sparkles" size={12} />다시 보기
                </button>
              </ProfileRow>
              <ProfileRow label="사용자 가이드" sub="기능 사용법을 정리한 문서">
                <button
                  className="btn btn-sm"
                  onClick={() => window.dispatchEvent(new CustomEvent("planary:open-guide"))}
                >
                  <Icon name="book" size={12} />열기
                </button>
              </ProfileRow>
            </div>
          </div>

          <PasswordCard />

          {/* HOME WIDGETS */}
          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>홈 위젯</h3>
              <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>홈 화면에 표시할 위젯을 선택하세요</p>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              <WidgetVisibilityManager t={t} setTweak={setTweak} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>알림 & 동기화</h3>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              {[
              { id: "email", label: "이메일 알림", sub: notifs.email ? "주간 요약 발송" : "발송 안 함" },
              { id: "push", label: "백그라운드 푸시 알림", sub: (() => { const p = window.Planary?.getPushPermission?.(); if (!notifs.push) return "꺼짐"; if (p === "granted") return "켜짐 · 리마인더 및 e-Class 새 항목"; if (p === "denied") return "브라우저에서 알림이 차단됨"; return "켜짐 (권한 대기 중)"; })() },
              { id: "gcal", label: "Google Calendar", sub: notifs.gcal ? "연결됨 · 양방향 동기화" : "연결 안 됨" },
              { id: "apple", label: "Apple Calendar", sub: notifs.apple ? "연결됨" : "연결 안 됨" },
              { id: "slack", label: "Slack 통합", sub: notifs.slack ? "연결됨" : "연결 안 됨" }].
              map((r) =>
              <ProfileRow key={r.id} label={r.label} sub={r.sub}>
                  <div
                  className={`switch ${notifs[r.id] ? "is-on" : ""}`}
                  onClick={() => {
                    const next = !notifs[r.id];
                    setNotifs((prev) => ({ ...prev, [r.id]: next }));
                    window.dispatchEvent(new CustomEvent("planary:save-notif-prefs", { detail: { [r.id]: next } }));
                    window.dispatchEvent(new CustomEvent("planary:notif-prefs-changed", { detail: { [r.id]: next } }));
                    window.Planary.toast({ type: "ok", title: `${r.label} ${next ? "켜짐" : "꺼짐"}` });
                  }} />
                
                </ProfileRow>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>2단계 인증 & 세션</h3>
              <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>로그인 보안과 활성 기기를 관리합니다</p>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              <div className="field-row">
                <div>
                  <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>2단계 인증</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>로그인 시 추가 인증을 요청합니다</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="chip">설정 안 됨</span>
                  <button className="btn btn-sm" onClick={() => setTfaOpen(true)}>설정하기</button>
                </div>
              </div>
              <div className="field-row" style={{ borderBottom: 0 }}>
                <div>
                  <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>활성 세션</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>현재 이 기기 포함 1개 이상 기기에서 로그인됨</div>
                </div>
                <button className="btn btn-sm" onClick={() => setSessionsOpen(true)}>전체 보기</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 22, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>로그아웃 / 계정 관리</div>
              <div style={{ fontSize: 12, color: "var(--text-lo)" }}>이 기기에서 세션을 종료하거나 계정을 전환합니다</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setSwitchOpen(true)}>
                <Icon name="refresh" size={14} />계정 변경
              </button>
              <button className="btn btn-ghost" style={{ color: "var(--err)" }} onClick={() => setSignOutOpen(true)}>
                <Icon name="logout" size={14} />로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      {editOpen && <ProfileEditDialog user={user} onClose={() => setEditOpen(false)} onSave={saveProfile} />}
      {signOutOpen && <SignOutDialog onClose={() => setSignOutOpen(false)} user={user} />}
      {switchOpen && <window.Planary.AccountSwitcherDialog onClose={() => setSwitchOpen(false)} />}
      {sessionsOpen && <SessionsDialog onClose={() => setSessionsOpen(false)} />}
      {tfaOpen && <TwoFactorSetupDialog onClose={() => setTfaOpen(false)} userEmail={user.email} />}
    </div>);

}

/* ===========================================================
   PASSWORD CHANGE CARD
   =========================================================== */
function PasswordCard() {
  const [current, setCurrent] = useStateO("");
  const [next, setNext] = useStateO("");
  const [confirm, setConfirm] = useStateO("");
  const [showCurrent, setShowCurrent] = useStateO(false);
  const [showNext, setShowNext] = useStateO(false);
  const [submitting, setSubmitting] = useStateO(false);

  // Validation
  const hasLength = next.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(next);
  const hasNumber = /[0-9]/.test(next);
  const hasSymbol = /[^a-zA-Z0-9]/.test(next);
  const score = [hasLength, hasLetter, hasNumber, hasSymbol].filter(Boolean).length;
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length >= 1 && hasLength && (hasLetter && hasNumber) && matches && !submitting;

  const strengthLabel = ["", "매우 약함", "약함", "보통", "강함", "매우 강함"][score];
  const strengthColor =
    score <= 1 ? "var(--err)" :
    score === 2 ? "var(--warn)" :
    score === 3 ? "var(--info)" :
    "var(--ok)";

  const submit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    window.dispatchEvent(new CustomEvent("planary:change-password", {
      detail: {
        current,
        next,
        onResult: (res) => {
          setSubmitting(false);
          if (res && res.ok) {
            setCurrent("");
            setNext("");
            setConfirm("");
          }
        },
      },
    }));
  };

  const inputWrap = {
    position: "relative",
  };
  const eyeBtn = {
    position: "absolute",
    right: 8, top: "50%", transform: "translateY(-50%)",
    width: 26, height: 26,
    display: "grid", placeItems: "center",
    color: "var(--text-lo)",
    background: "transparent", border: 0,
    borderRadius: 6, cursor: "pointer",
  };

  return (
    <div className="card" style={{ marginTop: 12, padding: 0 }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>비밀번호</h3>
        <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
          정기적으로 변경하면 더 안전해요
        </p>
      </div>
      <form onSubmit={submit} style={{ padding: "16px 22px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Current */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
              현재 비밀번호
            </label>
            <div style={inputWrap}>
              <input
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="현재 비밀번호 입력"
                autoComplete="current-password"
                className="form-input"
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={eyeBtn} title={showCurrent ? "감추기" : "보이기"} tabIndex={-1}>
                <Icon name={showCurrent ? "lock" : "eye"} size={13} />
              </button>
            </div>
          </div>

          {/* New */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
              새 비밀번호
            </label>
            <div style={inputWrap}>
              <input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="8자 이상, 영문 + 숫자 조합"
                autoComplete="new-password"
                className="form-input"
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowNext(!showNext)} style={eyeBtn} title={showNext ? "감추기" : "보이기"} tabIndex={-1}>
                <Icon name={showNext ? "lock" : "eye"} size={13} />
              </button>
            </div>
            {next.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 999,
                        background: i <= score ? strengthColor : "var(--surface-2)",
                        transition: "all var(--dur-fast)",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                  <span style={{ color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                  <span style={{ color: "var(--text-faint)" }}>{next.length}자</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { ok: hasLength, label: "8자 이상" },
                    { ok: hasLetter, label: "영문 포함" },
                    { ok: hasNumber, label: "숫자 포함" },
                    { ok: hasSymbol, label: "특수문자 (권장)", optional: true },
                  ].map((req, i) => (
                    <div
                      key={i}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 10, fontWeight: 600,
                        color: req.ok ? "var(--ok)" : req.optional ? "var(--text-faint)" : "var(--text-lo)",
                      }}
                    >
                      <Icon name={req.ok ? "check" : "x"} size={10} stroke={3} />
                      {req.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
              새 비밀번호 확인
            </label>
            <input
              type={showNext ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="새 비밀번호를 다시 입력"
              autoComplete="new-password"
              className="form-input"
              style={confirm.length > 0 ? {
                borderColor: matches ? "color-mix(in oklab, var(--ok) 40%, var(--border))" : "color-mix(in oklab, var(--err) 40%, var(--border))",
              } : undefined}
            />
            {confirm.length > 0 && !matches && (
              <div style={{ fontSize: 11, color: "var(--err)", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="x" size={10} stroke={3} />비밀번호가 일치하지 않아요
              </div>
            )}
            {confirm.length > 0 && matches && (
              <div style={{ fontSize: 11, color: "var(--ok)", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="check" size={10} stroke={3} />일치합니다
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "var(--text-lo)" }}
            onClick={() => {
              const email = window.Planary.USER?.email;
              if (!email) { window.Planary.toast?.({ type: "err", title: "이메일 정보가 없어요" }); return; }
              window.dispatchEvent(new CustomEvent("planary:reset-password-email", { detail: { email } }));
              window.Planary.toast?.({ type: "ok", title: "재설정 메일을 발송했어요", sub: email });
            }}
          >
            <Icon name="send" size={12} />이메일로 재설정
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            <Icon name={submitting ? "refresh" : "lock"} size={12} style={{ animation: submitting ? "spin 1s linear infinite" : "none" }} />
            {submitting ? "변경 중…" : "비밀번호 변경"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileRow({ label, sub, children }) {
  return (
    <div className="field-row">
      <div>
        <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{sub}</div>
      </div>
      {children}
    </div>);

}

function ProfileDropdownRow({ label, value, options, selected, onSelect, open, onOpen, onClose }) {
  return (
    <div style={{ position: "relative" }}>
      <ProfileRow label={label} sub={value}>
        <button className="btn btn-sm btn-ghost" onClick={() => open ? onClose() : onOpen()}>
          변경 <Icon name="chevronDown" size={11} />
        </button>
      </ProfileRow>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={onClose} />
          <div
            className="tool-popover"
            style={{ position: "absolute", top: "100%", right: 0, left: "auto", bottom: "auto", minWidth: 220, zIndex: 50, marginTop: -4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((o) => (
              <button
                key={o.id}
                className={`tool-popover-item ${selected === o.id ? "is-active" : ""}`}
                onClick={() => { onSelect(o.id); onClose(); }}
                type="button"
              >
                <span style={{ flex: 1 }}>{o.label}</span>
                {selected === o.id && <Icon name="check" size={12} stroke={3} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ===========================================================
   e-CLASS CONNECTION CARD (Profile)
   =========================================================== */
function EclassConnectionCard() {
  const { USER, PROJECTS, TASKS } = window.Planary;
  const eclassProject = PROJECTS.find((p) => p.isEclass) || PROJECTS.find((p) => p.id === "pe");
  const isConnectionLive = (d) => !!(d && d.enabled !== false && (d.encryptedSessionCookie || (d.encryptedUsername && d.encryptedPassword) || d.username || d.connected));
  const initialConn = window.Planary.ECLASS_CONNECTION;
  const [connection, setConnection] = useStateO(initialConn);
  const [connected, setConnected] = useStateO(isConnectionLive(initialConn));
  const [autoSync, setAutoSync] = useStateO(true);
  const [syncing, setSyncing] = useStateO(false);
  const [showCourses, setShowCourses] = useStateO(false);
  const [urlInput, setUrlInput] = useStateO((initialConn && initialConn.baseUrl) || "https://eclass.seoultech.ac.kr");
  const [idInput, setIdInput] = useStateO("");
  const [pwInput, setPwInput] = useStateO("");

  // Live-sync e-Class connection state from firebase-bridge
  useEffectO(() => {
    const onConn = (e) => {
      setConnection(e.detail);
      setConnected(isConnectionLive(e.detail));
    };
    window.addEventListener("planary:eclass-connection", onConn);
    return () => window.removeEventListener("planary:eclass-connection", onConn);
  }, []);

  // Derive real values from synced tasks for this user's eClass project.
  const syncedTasks = eclassProject
    ? TASKS.filter((t) => t.project === eclassProject.id && !t.archived)
    : [];
  const courseTitles = [...new Set(
    syncedTasks.map((t) => t.course || (t._raw && t._raw.courseTitle)).filter(Boolean)
  )];
  const formatRelative = (ts) => {
    if (!ts) return null;
    const ms = ts && ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
    if (!Number.isFinite(ms)) return null;
    const diff = Math.max(0, Date.now() - ms);
    if (diff < 60_000) return "방금";
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}분 전`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}시간 전`;
    return `${Math.round(diff / 86_400_000)}일 전`;
  };
  const lastSyncLabel = formatRelative(connection && connection.lastSyncedAt) || "기록 없음";
  const schoolLabel = USER.school || (connection && connection.platform === "seoultech-moodle" ? "서울과학기술대학교" : "");
  const studentIdLabel = USER.studentId || "";

  const handleSync = () => {
    setSyncing(true);
    window.dispatchEvent(new CustomEvent("planary:eclass-sync", {
      detail: { onResult: () => setSyncing(false) },
    }));
  };

  const handleConnect = () => {
    if (!urlInput.trim() || !idInput.trim() || !pwInput) return;
    window.dispatchEvent(new CustomEvent("planary:eclass-connect", {
      detail: {
        url: urlInput.trim(),
        id: idInput.trim(),
        password: pwInput,
        onResult: (res) => {
          if (res && res.ok) {
            setConnected(true);
          }
          setPwInput("");
        },
      },
    }));
  };

  const handleDisconnect = () => {
    window.dispatchEvent(new CustomEvent("planary:eclass-disconnect", {
      detail: {
        onResult: (res) => {
          if (res && res.ok) setConnected(false);
        },
      },
    }));
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: "color-mix(in oklab, var(--info) 30%, var(--border))" }}>
      <div style={{
        padding: "16px 22px 14px",
        borderBottom: "1px solid var(--border-soft)",
        display: "flex", alignItems: "center", gap: 12
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: "var(--r-md)",
          background: "color-mix(in oklab, var(--info) 18%, var(--surface))",
          color: "var(--info)",
          display: "grid", placeItems: "center",
          flexShrink: 0
        }}>
          <Icon name="globe" size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>e-Class 연동</h3>
            {connected ?
            <span className="chip" style={{ background: "color-mix(in oklab, var(--ok) 12%, transparent)", color: "var(--ok)", borderColor: "transparent", height: 20, padding: "0 7px", fontSize: 10 }}>
                <span className="status-dot is-live" style={{ width: 5, height: 5, background: "var(--ok)", boxShadow: "none", animation: "none" }} />연결됨
              </span> :

            <span className="chip" style={{ height: 20, padding: "0 7px", fontSize: 10 }}>연결 전</span>
            }
          </div>
          <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
            {schoolLabel ? `${schoolLabel} ` : ""}e-Class에서 강의·과제·시험 일정을 자동으로 가져옵니다
          </p>
        </div>
      </div>

      {connected ?
      <div style={{ padding: "8px 22px 18px" }}>
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>학교</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{schoolLabel || "—"}</div>
            </div>
            {studentIdLabel && <span className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>학번 {studentIdLabel}</span>}
          </div>
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>동기화 대상</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{courseTitles.length}개 강의 · 작업 {syncedTasks.length}개</div>
            </div>
            <button className="btn btn-sm" onClick={() => setShowCourses(s => !s)}>
              강의 {showCourses ? "접기" : "보기"}
            </button>
          </div>
          {showCourses && (
            <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "10px 14px", marginBottom: 8 }}>
              {courseTitles.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", padding: "8px 0" }}>
                  동기화된 강의가 없어요
                </div>
              ) : courseTitles.map((title, i) => (
                <div key={title} style={{ fontSize: 12, color: "var(--text-hi)", padding: "6px 0", borderBottom: i < courseTitles.length - 1 ? "1px solid var(--border-soft)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="book" size={11} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
                  {title}
                </div>
              ))}
            </div>
          )}
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>자동 동기화</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>앱 사용 중 5분마다, 백엔드에서 하루 1회</div>
            </div>
            <div className={`switch ${autoSync ? "is-on" : ""}`} onClick={() => setAutoSync(!autoSync)} />
          </div>
          <div className="field-row" style={{ borderBottom: 0 }}>
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>마지막 동기화</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{lastSyncLabel} · 항목 {syncedTasks.length}개</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleSync} disabled={syncing} style={{ minWidth: 120, justifyContent: "center" }}>
              <Icon name="refresh" size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "동기화 중…" : "지금 동기화"}
            </button>
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--border-soft)" }}>
            <div className="kicker" style={{ marginBottom: 10 }}>지원 학교</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span className="chip">서울과학기술대학교</span>
              <button className="chip" style={{ borderStyle: "dashed", color: "var(--text-faint)", cursor: "pointer" }}>
                <Icon name="plus" size={10} />학교 추가 요청
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, lineHeight: 1.5 }}>
              비밀번호는 서버에서 암호화되어 저장됩니다. 언제든 연결을 해제할 수 있고, 해제 시 동기화된 작업은 보관함으로 이동합니다.
            </p>
            <button
            className="btn btn-sm"
            style={{ color: "var(--err)", marginTop: 8 }}
            onClick={handleDisconnect}>

              <Icon name="lock" size={12} />연결 해제
            </button>
          </div>
        </div> :

      <div style={{ padding: 22 }}>
          <p style={{ fontSize: 13, color: "var(--text-md)", marginBottom: 14, lineHeight: 1.5 }}>
            학교 e-Class 계정을 연결하면 강의·과제·시험이 <strong style={{ color: "var(--text-hi)" }}>e-Class 프로젝트</strong>로 자동 동기화됩니다.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>e-Class URL</label>
              <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                width: "100%", marginTop: 4,
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "8px 10px",
                fontSize: 13, color: "var(--text-hi)",
                outline: "none"
              }} />
            
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>아이디</label>
                <input
                type="text"
                placeholder="학번 또는 ID"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                style={{
                  width: "100%", marginTop: 4,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "8px 10px",
                  fontSize: 13, color: "var(--text-hi)",
                  outline: "none"
                }} />
              
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>비밀번호</label>
                <input
                type="password"
                placeholder="••••••••"
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                style={{
                  width: "100%", marginTop: 4,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "8px 10px",
                  fontSize: 13, color: "var(--text-hi)",
                  outline: "none"
                }} />
              
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={handleConnect}>
            <Icon name="lock" size={13} />연결 저장
          </button>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, lineHeight: 1.5 }}>
            비밀번호는 서버에서 암호화(AES-256)되어 저장되며, 동기화 외 다른 용도로 사용되지 않습니다.
          </p>
        </div>
      }
    </div>);

}


window.Planary = Object.assign(window.Planary || {}, { ProfilePage });
