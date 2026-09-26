/* Profile-specific dialogs; shared hooks are initialized by pages-rest.jsx. */
/* ===========================================================
   SESSIONS DIALOG
   =========================================================== */
function SessionsDialog({ onClose }) {
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "브라우저";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "기기";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>활성 세션</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>로그인된 기기 목록입니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--surface-2)", borderRadius: "var(--r-md)", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="globe" size={18} style={{ color: "var(--accent)" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{browser} · {os}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{today} 로그인</div>
              </div>
            </div>
            <span className="chip chip-ok" style={{ height: 20, fontSize: 10, padding: "0 7px" }}>현재 기기</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 14, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
            <Icon name="info" size={11} style={{ verticalAlign: -2, marginRight: 5 }} />
            다른 기기의 세션을 강제로 종료하려면 비밀번호를 변경하세요.
          </div>
        </div>
        <div className="dialog-foot">
          <button
            className="btn btn-sm btn-ghost"
            style={{ color: "var(--err)" }}
            onClick={() => { window.dispatchEvent(new CustomEvent("planary:sign-out")); onClose(); }}
          >
            <Icon name="logout" size={12} />이 기기에서 로그아웃
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   2FA SETUP DIALOG
   =========================================================== */
function TwoFactorSetupDialog({ onClose, userEmail }) {
  const [method, setMethod] = useStateO("email");
  const [sent, setSent] = useStateO(false);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSetup = () => {
    window.dispatchEvent(new CustomEvent("planary:setup-2fa", { detail: { method, email: userEmail } }));
    setSent(true);
    if (method === "email") {
      window.Planary.toast?.({ type: "ok", title: "인증 코드를 이메일로 발송했어요", sub: userEmail });
    } else {
      window.Planary.toast?.({ type: "info", title: "준비 중인 기능이에요" });
    }
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>2단계 인증 설정</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>로그인 시 추가 인증 방법을 선택하세요</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          {[
            { id: "email", icon: "send", label: "이메일 인증", desc: `${userEmail || "등록된 이메일"}로 코드 전송` },
            { id: "totp",  icon: "clock", label: "인증 앱 (TOTP)", desc: "Google Authenticator 등 사용 (준비 중)" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => m.id !== "totp" && setMethod(m.id)}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                padding: "12px 14px", borderRadius: "var(--r-md)", marginBottom: 8, cursor: m.id === "totp" ? "not-allowed" : "pointer",
                background: method === m.id ? "var(--accent-soft)" : "var(--surface-2)",
                border: `1.5px solid ${method === m.id ? "var(--accent)" : "transparent"}`,
                opacity: m.id === "totp" ? 0.5 : 1,
              }}
            >
              <Icon name={m.icon} size={18} style={{ color: method === m.id ? "var(--accent)" : "var(--text-lo)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{m.desc}</div>
              </div>
              {method === m.id && <Icon name="check" size={14} stroke={3} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
            </button>
          ))}
          {sent && (
            <div style={{ fontSize: 12, color: "var(--ok)", display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Icon name="check" size={12} stroke={3} />코드가 발송됐어요. 받은편지함을 확인하세요.
            </div>
          )}
        </div>
        <div className="dialog-foot">
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" onClick={handleSetup} disabled={sent}>
            <Icon name="send" size={12} />{sent ? "발송됨" : "코드 발송"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   SIGN OUT / DELETE ACCOUNT DIALOG
   =========================================================== */
function SignOutDialog({ onClose, user }) {
  const [mode, setMode] = useStateO("signout"); // signout | delete
  const [confirmText, setConfirmText] = useStateO("");
  const expected = user && user.email ? user.email : "";

  useEffectO(() => {
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = () => {
    window.Planary.toast({ type: "info", title: "로그아웃 중…", sub: "잠시 후 로그인 화면으로 이동합니다" });
    window.dispatchEvent(new CustomEvent("planary:sign-out"));
    setTimeout(onClose, 600);
  };
  const deleteAccount = () => {
    if (confirmText !== expected) return;
    window.dispatchEvent(new CustomEvent("planary:delete-account", {
      detail: {
        onResult: (res) => {
          if (res && res.ok) {
            window.Planary.toast({ type: "err", title: "계정이 삭제됐어요", sub: "복구는 30일 이내에만 가능합니다", ttl: 4800 });
          } else {
            window.Planary.toast({ type: "err", title: "계정 삭제 실패", sub: res && res.error });
          }
        },
      },
    }));
    setTimeout(onClose, 600);
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>
              {mode === "signout" ? "로그아웃" : "계정 탈퇴"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
              {mode === "signout" ?
              "이 기기에서 세션을 종료합니다. 데이터는 그대로 유지돼요." :
              "계정과 모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다."}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-sm)" }}>
            {[
            { id: "signout", label: "로그아웃", icon: "logout" },
            { id: "delete", label: "계정 탈퇴", icon: "trash" }].
            map((t) =>
            <button
              key={t.id}
              onClick={() => {setMode(t.id);setConfirmText("");}}
              style={{
                flex: 1, height: 30, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontSize: 12, fontWeight: 600,
                background: mode === t.id ? "var(--surface)" : "transparent",
                color: mode === t.id ? t.id === "delete" ? "var(--err)" : "var(--text-hi)" : "var(--text-lo)",
                boxShadow: mode === t.id ? "var(--shadow-sm)" : "none"
              }}>
              
                <Icon name={t.icon} size={12} />{t.label}
              </button>
            )}
          </div>

          {mode === "signout" ?
          <>
              <div style={{ padding: 14, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)" }}>
                <div style={{ fontSize: 13, color: "var(--text-md)", lineHeight: 1.6 }}>
                  로그아웃해도 작업·노트·위키·북마크는 모두 안전하게 보관됩니다. 같은 계정으로 다시 로그인하면 그대로 이어집니다.
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
              "이 기기에서 세션만 종료",
              "데이터는 클라우드에 그대로 유지",
              "다른 기기에는 영향 없음"].
              map((p, i) =>
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-md)" }}>
                    <Icon name="check" size={11} stroke={3} style={{ color: "var(--ok)" }} />{p}
                  </li>
              )}
              </ul>
            </> :

          <>
              <div style={{ padding: 14, background: "color-mix(in oklab, var(--err) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--err) 30%, var(--border))", borderRadius: "var(--r-md)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                  <Icon name="flag" size={16} style={{ color: "var(--err)", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: "var(--text-hi)", lineHeight: 1.55 }}>
                    <strong>이 작업은 되돌릴 수 없습니다.</strong><br />
                    <span style={{ color: "var(--text-md)" }}>
                      계정과 함께 모든 작업·노트·위키·북마크·메모·e-Class 연결이 영구 삭제됩니다. 30일 이내에는 같은 이메일로 복구 요청을 보낼 수 있습니다.
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  확인을 위해 이메일을 입력하세요
                </label>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, marginBottom: 6, fontFamily: "var(--font-mono)" }}>{expected}</div>
                <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expected}
                className="form-input"
                style={{ fontFamily: "var(--font-mono)" }} />
              
              </div>
            </>
          }
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            {mode === "delete" && confirmText !== expected ? "이메일이 일치하지 않습니다" : ""}
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          {mode === "signout" ?
          <button className="btn btn-sm" style={{ color: "var(--err)", borderColor: "color-mix(in oklab, var(--err) 30%, var(--border))" }} onClick={signOut}>
              <Icon name="logout" size={12} />로그아웃
            </button> :

          <button
            className="btn btn-sm btn-primary"
            style={{ background: "var(--err)", color: "white" }}
            disabled={confirmText !== expected}
            onClick={deleteAccount}>
            
              <Icon name="trash" size={12} />영구 삭제
            </button>
          }
        </div>
      </div>
    </div>);

}

/* ===========================================================
   PROFILE EDIT DIALOG
   =========================================================== */
function ProfileEditDialog({ user, onClose, onSave }) {
  const [draft, setDraft] = useStateO({ ...user });
  const fileRef = useRefO(null);
  const update = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));
  const isImage = draft.avatar && typeof draft.avatar === "string" && draft.avatar.startsWith("url(");

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      window.Planary?.toast?.({ type: "err", title: "파일이 너무 커요", sub: "5MB 이하 이미지를 선택해 주세요" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("avatar", `url("${reader.result}")`);
    reader.readAsDataURL(file);
  };

  const SCHOOLS = [
  "서울과학기술대학교", "서울대학교", "연세대학교", "고려대학교",
  "한양대학교", "성균관대학교", "이화여자대학교", "중앙대학교",
  "건국대학교", "동국대학교", "기타"];


  useEffectO(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(draft);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(620px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>프로필 편집</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>이름·아바타·학교 정보를 변경합니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div className="kicker" style={{ marginBottom: 10 }}>프로필 사진</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div
              style={{
                width: 76, height: 76,
                borderRadius: "50%",
                background: isImage ? `${draft.avatar} center/cover no-repeat` : "var(--accent-soft)",
                color: "var(--accent)",
                display: "grid", placeItems: "center",
                fontSize: 30, fontWeight: 800,
                border: "1px solid var(--border)",
                flexShrink: 0, overflow: "hidden"
              }}>
              
              {!isImage && draft.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current && fileRef.current.click()} type="button">
                  <Icon name="image" size={12} />사진 업로드
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {const url = window.prompt("이미지 URL", "");if (url) update("avatar", `url("${url}")`);}}
                  type="button">
                  
                  <Icon name="link" size={12} />URL로 추가
                </button>
                {isImage &&
                <button className="btn btn-sm" style={{ color: "var(--err)" }} onClick={() => update("avatar", null)} type="button">
                    <Icon name="trash" size={12} />제거
                  </button>
                }
              </div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>
                정사각형 이미지 권장 · 5MB까지. 비워두면 이니셜이 표시됩니다.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
            <FormField label="이름">
              <input
                value={draft.name}
                onChange={(e) => {
                  const v = e.target.value;
                  update("name", v);
                  const parts = v.split(/\s+/).filter(Boolean);
                  const initials = parts.length > 1 ?
                  (parts[1][0] + parts[0][0]).toUpperCase() :
                  v.slice(0, 2).toUpperCase();
                  update("initials", initials);
                }}
                className="form-input"
                placeholder="이름" />
              
            </FormField>
            <FormField label="이메일" hint="이메일은 변경할 수 없습니다">
              <div style={{ position: "relative" }}>
                <input value={draft.email} readOnly className="form-input" style={{ cursor: "default", color: "var(--text-lo)" }} placeholder="email@example.com" />
                <span className="chip chip-ok" style={{ position: "absolute", right: 6, top: 6, height: 22, fontSize: 10 }}>
                  <Icon name="check" size={9} stroke={3} />인증됨
                </span>
              </div>
            </FormField>
            <FormField label="학교">
              <select value={draft.school || ""} onChange={(e) => update("school", e.target.value)} className="form-input">
                {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="학번">
              <input value={draft.studentId || ""} onChange={(e) => update("studentId", e.target.value)} className="form-input" placeholder="학번" />
            </FormField>
          </div>

          <div style={{ marginTop: 12 }}>
            <FormField label="자기소개" hint="선택 · 최대 140자">
              <textarea
                value={draft.bio || ""}
                onChange={(e) => update("bio", e.target.value.slice(0, 140))}
                placeholder="간단한 자기소개를 적어주세요"
                rows={2}
                className="form-input"
                style={{ resize: "vertical", lineHeight: 1.5 }} />
              
              <div style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "right", marginTop: 2 }}>
                {(draft.bio || "").length}/140
              </div>
            </FormField>
          </div>
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            변경사항은 모든 기기에서 동기화됩니다
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
            저장 <span className="kbd" style={{ marginLeft: 4 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>);

}

function FormField({ label, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{hint}</span>}
      </div>
      {children}
    </label>);

}

