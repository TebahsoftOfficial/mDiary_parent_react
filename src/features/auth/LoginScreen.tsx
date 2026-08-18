// 로그인 — Flutter login_screen.dart 이식 (캐릭터 + 폼 + 가입/비번재설정 링크).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tr } from '../../core/i18n/i18n';
import { CharacterImage } from '../../app/emoticons';
import { SeamBusyButton, showToast } from '../../app/ui';
import { useAuth } from './AuthContext';
import { PasswordResetSheet } from './PasswordResetSheet';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <CharacterImage mood="hello" size={110} />
      </div>
      <h1
        style={{
          margin: 0,
          textAlign: 'center',
          fontSize: 24,
          color: 'var(--seam-brand-point)',
        }}
      >
        SEAMSPACE Family
      </h1>
      <p
        style={{
          margin: '0 0 16px',
          textAlign: 'center',
          color: 'var(--seam-text-secondary)',
          fontSize: 14,
        }}
      >
        {tr('auth.tagline')}
      </p>
      <input
        id="login_username_input"
        className="seam-input"
        placeholder={tr('auth.usernameLabel')}
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        id="login_password_input"
        className="seam-input"
        type="password"
        placeholder={tr('auth.passwordLabel')}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
      />
      <div style={{ marginTop: 8 }}>
        <SeamBusyButton id="login_submit_btn" label={tr('auth.login')} busy={busy} onClick={submit} />
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
        }}
      >
        <Link
          id="login_goto_signup_btn"
          to="/signup"
          style={{ color: 'var(--seam-brand-point)', fontWeight: 600, textDecoration: 'none' }}
        >
          {tr('auth.gotoSignup')}
        </Link>
        <span style={{ color: 'var(--seam-text-disabled)' }}>·</span>
        <button
          id="login_pwreset_btn"
          onClick={() => setResetOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--seam-text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {tr('auth.forgotPassword')}
        </button>
      </div>
      <PasswordResetSheet open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
