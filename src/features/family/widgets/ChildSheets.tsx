// 자녀 계정 시트들 — Flutter add_child_sheet.dart + edit_child_sheet.dart 이식.
// Add: 이름/아이디(중복 확인)/비밀번호(eye)/생일/성별 → 생성 완료 자격증명 카드(복사).
// Edit: 이름/호칭/생일/성별 (PATCH profile/).
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { SeamBusyButton, SeamSheet, showToast } from '../../../app/ui';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import type { ChildAccount } from '../models';

function GenderChips({
  idPrefix,
  value,
  onChanged,
}: {
  idPrefix: string;
  value: string;
  onChanged: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(
        [
          ['male', tr('child.male')],
          ['female', tr('child.female')],
        ] as [string, string][]
      ).map(([v, label]) => {
        const selected = value === v;
        return (
          <button
            key={v}
            id={`${idPrefix}_gender_${v}`}
            // 같은 값을 다시 누르면 해제 (선택 입력)
            onClick={() => onChanged(selected ? '' : v)}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--seam-radius-full)',
              border: `1px solid ${selected ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
              background: selected ? 'var(--seam-brand)' : 'transparent',
              color: selected ? '#fff' : 'var(--seam-text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--seam-text-secondary)',
  margin: '12px 0 4px',
} as const;

/** Add Child 바텀시트 — 대표 프로토타입 모달 미러. 규칙은 교사웹 학생 등록과 동일(서버가 최종 검증). */
export function AddChildSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const familyId = useFamilyId();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [busy, setBusy] = useState(false);
  // 아이디 중복 확인 (시안 C-4b) — null=미확인, true/false=확인 결과
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // 생성 완료 — 아이에게 전달할 로그인 정보 카드
  const [created, setCreated] = useState<{ child: ChildAccount; password: string } | null>(null);

  const checkUsername = async () => {
    const u = username.trim();
    if (u === '' || checking) return;
    setChecking(true);
    try {
      setUsernameAvailable(await repo.usernameAvailable(u));
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const child = await repo.addChild(familyId, {
        name: name.trim(),
        username: username.trim(),
        password,
        birthDate: birthDate || undefined,
        gender,
      });
      await queryClient.invalidateQueries({ queryKey: ['children', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
      setCreated({ child, password });
      setName('');
      setUsername('');
      setPassword('');
      setBirthDate('');
      setGender('');
      setUsernameAvailable(null);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SeamSheet open={open && created === null} onClose={onClose}>
        <h3 style={{ margin: '4px 0 4px', fontSize: 18 }}>{tr('child.addTitle')}</h3>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--seam-text-secondary)', lineHeight: 1.4 }}>
          {tr('child.addDesc')}
        </p>
        <label style={labelStyle}>{tr('child.name')}</label>
        <input
          id="add_child_name_input"
          className="seam-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%' }}
        />
        <label style={labelStyle}>{tr('child.username')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="add_child_username_input"
            className="seam-input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameAvailable(null);
            }}
            style={{ flex: 1 }}
          />
          <button
            id="add_child_username_check_btn"
            disabled={checking}
            onClick={() => void checkUsername()}
            style={{
              padding: '0 12px',
              borderRadius: 'var(--seam-radius-md)',
              border: '1px solid var(--seam-brand-tint-border)',
              background: 'transparent',
              color: 'var(--seam-brand-point)',
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {tr('child.checkUsername')}
          </button>
        </div>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 11.5,
            color:
              usernameAvailable === null
                ? 'var(--seam-text-secondary)'
                : usernameAvailable
                  ? 'var(--seam-success)'
                  : 'var(--seam-error)',
          }}
        >
          {usernameAvailable === null
            ? tr('child.usernameHelper')
            : usernameAvailable
              ? tr('child.usernameAvailable')
              : tr('child.usernameTaken')}
        </p>
        <label style={labelStyle}>{tr('child.password')}</label>
        <div style={{ position: 'relative' }}>
          <input
            id="add_child_password_input"
            className="seam-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', paddingRight: 40 }}
          />
          <button
            id="add_child_password_eye_btn"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 15,
              color: 'var(--seam-text-disabled)',
            }}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--seam-text-secondary)' }}>
          {tr('child.passwordHelper')}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, margin: '0 0 4px' }}>{tr('child.birthOptional')}</label>
            <input
              id="add_child_birth_btn"
              className="seam-input"
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <GenderChips idPrefix="add_child" value={gender} onChanged={setGender} />
        </div>
        <div style={{ marginTop: 20, paddingBottom: 4 }}>
          <SeamBusyButton
            id="add_child_submit_btn"
            label={tr('child.createAccount')}
            busy={busy}
            onClick={() => void submit()}
          />
        </div>
      </SeamSheet>

      {/* 생성 완료 안내 — 아이에게 전달할 로그인 정보 카드 (복사 지원) */}
      <SeamSheet
        open={created !== null}
        onClose={() => {
          setCreated(null);
          onClose();
        }}
      >
        {created && (
          <>
            <h3 style={{ margin: '4px 0 8px', fontSize: 17 }}>
              {tr('child.createdTitle', { name: created.child.nickname })}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)' }}>
              {tr('child.createdDesc')}
            </p>
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 'var(--seam-radius-md)',
                background: 'var(--seam-brand-tint-bg)',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {tr('child.credentials', {
                username: created.child.username,
                password: created.password,
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingBottom: 4 }}>
              <button
                id="credentials_copy_btn"
                className="seam-btn seam-btn--ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    tr('child.credentialsCopy', {
                      username: created.child.username,
                      password: created.password,
                    }),
                  );
                  setCreated(null);
                  onClose();
                }}
              >
                {tr('child.copyAndClose')}
              </button>
              <button
                id="credentials_ok_btn"
                className="seam-btn"
                onClick={() => {
                  setCreated(null);
                  onClose();
                }}
              >
                {tr('common.confirm')}
              </button>
            </div>
          </>
        )}
      </SeamSheet>
    </>
  );
}

/** 자녀 정보 수정 시트 — 이름/호칭/생일/성별 (PATCH profile/). */
export function EditChildSheet({
  child,
  onClose,
}: {
  child: ChildAccount | null;
  onClose: () => void;
}) {
  const familyId = useFamilyId();
  const queryClient = useQueryClient();
  const [forId, setForId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [busy, setBusy] = useState(false);

  // 대상 자녀가 바뀌면 원본으로 초기화
  if (child && child.membershipId !== forId) {
    setForId(child.membershipId);
    setName(child.name);
    setNickname(child.nickname);
    setBirthDate(child.birthDate ? child.birthDate.toISOString().slice(0, 10) : '');
    setGender(child.gender);
  }

  const submit = async () => {
    if (!child) return;
    setBusy(true);
    try {
      await repo.updateChildProfile(familyId, child.membershipId, {
        name: name.trim(),
        nickname: nickname.trim(),
        birth_date: birthDate,
        gender,
      });
      await queryClient.invalidateQueries({ queryKey: ['children', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
      onClose();
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SeamSheet open={child !== null} onClose={onClose}>
      <h3 style={{ margin: '4px 0 10px', fontSize: 18 }}>
        {tr('child.editTitle', { name: child?.nickname ?? '' })}
      </h3>
      <label style={labelStyle}>{tr('child.name')}</label>
      <input
        id="edit_child_name_input"
        className="seam-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%' }}
      />
      <label style={labelStyle}>{tr('child.nicknameLabel')}</label>
      <input
        id="edit_child_nickname_input"
        className="seam-input"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, margin: '0 0 4px' }}>{tr('child.birthOptional')}</label>
          <input
            id="edit_child_birth_btn"
            className="seam-input"
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <GenderChips idPrefix="edit_child" value={gender} onChanged={setGender} />
      </div>
      <div style={{ marginTop: 20, paddingBottom: 4 }}>
        <SeamBusyButton
          id="edit_child_submit_btn"
          label={tr('common.save')}
          busy={busy}
          onClick={() => void submit()}
        />
      </div>
    </SeamSheet>
  );
}
