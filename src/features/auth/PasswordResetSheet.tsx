// 비밀번호 재설정 2단계 시트 — Flutter password_reset_sheet.dart 이식.
// 1단계 이메일→코드 요청, 2단계 코드+새 비번 확정.
import { useState } from 'react';
import { postJson } from '../../core/apiClient';
import { apiPaths } from '../../core/apiPaths';
import { tr } from '../../core/i18n/i18n';
import { SeamBusyButton, SeamSheet, showToast } from '../../app/ui';

export function PasswordResetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStep(1);
    setCode('');
    setPassword('');
    onClose();
  };

  const requestCode = async () => {
    setBusy(true);
    try {
      await postJson(apiPaths.passwordResetRequest, { email: email.trim() }, 200);
      showToast(tr('auth.resetCodeSent'));
      setStep(2);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await postJson(
        apiPaths.passwordResetConfirm,
        { email: email.trim(), code: code.trim(), password },
        200,
      );
      showToast(tr('auth.resetDone'));
      close();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeamSheet open={open} onClose={close}>
      <h3 style={{ margin: '4px 0 4px' }}>{tr('auth.resetTitle')}</h3>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--seam-text-secondary)' }}>
        {tr('auth.resetSubtitle')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="seam-input"
          type="email"
          placeholder={tr('auth.emailLabel')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === 2}
        />
        {step === 2 && (
          <>
            <input
              className="seam-input"
              placeholder={tr('auth.codeLabel')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <p style={{ margin: 0, fontSize: 12, color: 'var(--seam-text-secondary)' }}>
              {tr('auth.codeHelper')}
            </p>
            <input
              className="seam-input"
              type="password"
              placeholder={tr('auth.newPasswordLabel')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        {step === 1 ? (
          <SeamBusyButton label={tr('auth.requestCode')} busy={busy} onClick={requestCode} />
        ) : (
          <SeamBusyButton label={tr('auth.changePassword')} busy={busy} onClick={confirm} />
        )}
      </div>
    </SeamSheet>
  );
}
