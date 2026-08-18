// 가족 없을 때 가족 생성 — Flutter family_setup_screen.dart 이식.
import { useState } from 'react';
import { tr } from '../../../core/i18n/i18n';
import { CharacterImage } from '../../../app/emoticons';
import { SeamBusyButton, showToast } from '../../../app/ui';
import { useAuth } from '../../auth/AuthContext';
import { useFamily } from '../FamilyContext';

export function FamilySetupScreen() {
  const { logout } = useAuth();
  const { createFamily } = useFamily();
  const [name, setName] = useState(tr('setup.defaultFamilyName'));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createFamily(name.trim());
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
        <CharacterImage mood="hug" size={110} />
      </div>
      <h2 style={{ margin: 0, textAlign: 'center' }}>{tr('setup.headline')}</h2>
      <p
        style={{
          margin: '0 0 12px',
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--seam-text-secondary)',
          whiteSpace: 'pre-line',
        }}
      >
        {tr('setup.description')}
      </p>
      <input
        className="seam-input"
        placeholder={tr('setup.familyName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <SeamBusyButton label={busy ? tr('setup.creating') : tr('setup.title')} busy={busy} onClick={submit} />
      <button className="seam-btn seam-btn--ghost" onClick={logout}>
        {tr('auth.logout')}
      </button>
    </div>
  );
}
