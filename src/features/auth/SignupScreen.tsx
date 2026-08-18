// v3 부모 가입 — 가입 한 번에 계정+가족 생성. 배우자 초대 토큰이 있으면 기존 가족 합류.
// Flutter signup_screen.dart 이식.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tr } from '../../core/i18n/i18n';
import { CharacterImage } from '../../app/emoticons';
import { SeamBusyButton, showToast } from '../../app/ui';
import { useAuth } from './AuthContext';

export function SignupScreen() {
  const { signup, spouseSignup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState(tr('auth.defaultFamilyName'));
  const [inviteToken, setInviteToken] = useState('');
  const [nickname, setNickname] = useState<'엄마' | '아빠'>('엄마');
  const [hasInvite, setHasInvite] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (hasInvite && inviteToken.trim()) {
        await spouseSignup({
          token: inviteToken.trim(),
          email: email.trim(),
          password,
          name: name.trim(),
          nickname,
        });
      } else {
        await signup({
          email: email.trim(),
          password,
          name: name.trim(),
          nickname,
          familyName: familyName.trim(),
        });
      }
      // 이후 이동은 라우터 가드가 처리 (loggedIn → 가족 로드 → 홈)
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chip = (n: '엄마' | '아빠', label: string) => (
    <button
      key={n}
      id={`signup_nickname_${n}`}
      onClick={() => setNickname(n)}
      style={{
        border: 'none',
        borderRadius: 'var(--seam-radius-full)',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
        background: nickname === n ? 'var(--seam-brand)' : 'var(--seam-surface-elevated)',
        color: nickname === n ? '#fff' : 'var(--seam-text-secondary)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '12px 8px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            padding: '4px 10px',
            color: 'var(--seam-text-primary)',
          }}
          aria-label="back"
        >
          ‹
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>{tr('auth.signupTitle')}</h2>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <CharacterImage mood="hug" size={96} />
        </div>
        <input
          id="signup_email_input"
          className="seam-input"
          type="email"
          placeholder={tr('auth.emailLabel')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <input
            id="signup_password_input"
            className="seam-input"
            type="password"
            placeholder={tr('auth.passwordLabel')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p style={{ margin: '6px 2px 0', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
            {tr('auth.passwordHelper')}
          </p>
        </div>
        <input
          id="signup_name_input"
          className="seam-input"
          placeholder={tr('auth.nameLabel')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--seam-text-secondary)' }}>
            {tr('auth.nicknameLabel')}
          </span>
          {chip('엄마', tr('auth.nicknameMom'))}
          {chip('아빠', tr('auth.nicknameDad'))}
        </div>
        {!hasInvite ? (
          <input
            id="signup_family_name_input"
            className="seam-input"
            placeholder={tr('auth.familyNameLabel')}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
          />
        ) : (
          <div>
            <input
              id="signup_invite_token_input"
              className="seam-input"
              placeholder={tr('auth.inviteTokenLabel')}
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
            />
            <p style={{ margin: '6px 2px 0', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
              {tr('auth.inviteTokenHelper')}
            </p>
          </div>
        )}
        <button
          id="signup_toggle_invite_btn"
          onClick={() => setHasInvite((v) => !v)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 12.5,
            color: 'var(--seam-brand-point)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {hasInvite ? tr('auth.createNewFamily') : tr('auth.haveInviteCode')}
        </button>
        <SeamBusyButton
          id="signup_submit_btn"
          label={hasInvite ? tr('auth.joinFamily') : tr('auth.createFamilyStart')}
          busy={busy}
          onClick={submit}
        />
      </div>
    </div>
  );
}
