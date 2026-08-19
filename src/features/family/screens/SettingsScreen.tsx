// '마이페이지' 탭 — Flutter settings_screen.dart 이식 (시안 C-3):
// 프로필 카드(부모 크게 + 자녀 Lv.N 작게 + Add child) → Writing·AI options(Accordion)
// → Permissions(Accordion) → 앱 설정 → 배우자 초대 → (Premium 배너 — flag off) → 로그아웃.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { SeamSheet, showToast } from '../../../app/ui';
import { useAuth } from '../../auth/AuthContext';
import { useFamily, useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import type { ChildAccount } from '../models';
import { AiConfigSection, PermissionsSection } from '../widgets/OptionSections';
import { AppSettingsSection } from '../widgets/AppSettingsSection';
import { AddChildSheet, EditChildSheet } from '../widgets/ChildSheets';

/// Seamspace Premium 배너 — 과금 정책·프리미엄 경계 미결이라 flag off (FEATURE_PLAN §10-4).
const SHOW_PREMIUM_BANNER = false;

export function SettingsScreen() {
  const familyId = useFamilyId();
  const { currentFamily } = useFamily();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const children = useQuery({
    queryKey: ['children', familyId],
    queryFn: () => repo.children(familyId),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [managing, setManaging] = useState<ChildAccount | null>(null);
  const [editing, setEditing] = useState<ChildAccount | null>(null);
  const [resetting, setResetting] = useState<ChildAccount | null>(null);
  const [deleting, setDeleting] = useState<ChildAccount | null>(null);
  const [spouseToken, setSpouseToken] = useState<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const inviteSpouse = async () => {
    try {
      setSpouseToken(await repo.spouseInviteToken(familyId));
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const resetPassword = async () => {
    if (!resetting) return;
    const target = resetting;
    try {
      await repo.resetChildPassword(familyId, target.membershipId, newPassword);
      showToast(tr('settings.passwordChanged', { name: target.nickname }));
    } catch (e) {
      showToast((e as Error).message);
    }
    setResetting(null);
    setNewPassword('');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await repo.deleteChild(familyId, deleting.membershipId);
      await queryClient.invalidateQueries({ queryKey: ['children', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
    } catch (e) {
      showToast((e as Error).message);
    }
    setDeleting(null);
  };

  const displayName =
    currentFamily && currentFamily.myNickname !== ''
      ? currentFamily.myNickname
      : tr('settings.defaultFamilyName');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header style={{ padding: '14px 20px 0' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{tr('settings.title')}</h2>
      </header>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 프로필 카드 (시안 C-3) */}
        <div className="seam-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: '50%',
                background: 'var(--seam-brand-tint-bg)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--seam-brand-point)',
              }}
            >
              {[...displayName][0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong
                  style={{
                    fontSize: 18,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </strong>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--seam-radius-full)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: 'var(--seam-brand-tint-bg)',
                    color: 'var(--seam-brand-point)',
                    flexShrink: 0,
                  }}
                >
                  {currentFamily?.familyName ?? ''} · {tr('settings.roleParent')}
                </span>
              </div>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 12.5,
                  color: 'var(--seam-text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentFamily?.myUsername ?? ''}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            {children.isLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
                <span className="seam-spinner" />
              </div>
            ) : children.isError ? (
              // 로드 실패를 "아이가 없어요"로 둔갑시키지 않는다 (감사 확정 버그)
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--seam-text-secondary)' }}>
                  {tr('settings.childrenLoadError', {
                    error: (children.error as Error).message,
                  })}
                </p>
                <button
                  id="children_retry_btn"
                  className="seam-btn seam-btn--ghost"
                  style={{ maxWidth: 120, margin: '8px auto 0' }}
                  onClick={() => void children.refetch()}
                >
                  {tr('common.retry')}
                </button>
              </div>
            ) : (children.data?.length ?? 0) === 0 ? (
              <p
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--seam-text-secondary)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {tr('settings.noChildren')}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {children.data!.map((child, i) => (
                  <ChildMiniCard
                    key={child.membershipId}
                    child={child}
                    warm={i % 2 === 1}
                    onTap={() => setManaging(child)}
                  />
                ))}
              </div>
            )}
          </div>
          {/* '+ Add child' — 시안의 점선 버튼 자리 (연보라 배경 + 보라 텍스트) */}
          <button
            id="settings_add_child_btn"
            onClick={() => setAddOpen(true)}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '13px 0',
              borderRadius: 'var(--seam-radius-md)',
              border: '1px solid var(--seam-brand-tint-border)',
              background: 'var(--seam-brand-tint-bg)',
              color: 'var(--seam-brand-point)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            + {tr('settings.addChild')}
          </button>
        </div>

        <AiConfigSection />
        <PermissionsSection />
        <AppSettingsSection />

        <div
          id="settings_spouse_invite_btn"
          className="seam-card"
          onClick={() => void inviteSpouse()}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <span style={{ fontSize: 18 }}>💜</span>
          <strong style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>
            {tr('settings.inviteSpouse')}
          </strong>
          <span style={{ color: 'var(--seam-text-disabled)' }}>›</span>
        </div>

        {SHOW_PREMIUM_BANNER && <PremiumBanner />}

        <button
          id="settings_logout_btn"
          onClick={() => setLogoutConfirm(true)}
          style={{
            padding: '13px 0',
            borderRadius: 'var(--seam-radius-md)',
            border: '1px solid var(--seam-error)',
            background: 'transparent',
            color: 'var(--seam-error)',
            fontSize: 14.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          ⎋ {tr('settings.logout')}
        </button>
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: 2,
            color: 'var(--seam-text-disabled)',
          }}
        >
          seamspace family
        </p>
      </div>

      <AddChildSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <EditChildSheet child={editing} onClose={() => setEditing(null)} />

      {/* 자녀 계정 관리 시트 (시안 C-4) — 정보 수정 / 비밀번호 재설정 / 삭제 */}
      <SeamSheet open={managing !== null} onClose={() => setManaging(null)}>
        {managing && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ flex: 1, fontSize: 16 }}>
                {tr('settings.manageChildTitle', { name: managing.nickname })}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--seam-text-secondary)' }}>
                {tr('settings.childUsername', { username: managing.username })}
              </span>
            </div>
            {(
              [
                ['edit', '✏️', tr('settings.editInfo'), false],
                ['resetpw', '🔑', tr('settings.resetPassword'), false],
                ['delete', '🗑', tr('settings.deleteAccount'), true],
              ] as [string, string, string, boolean][]
            ).map(([action, icon, label, danger]) => (
              <div
                key={action}
                id={`child_${managing.membershipId}_${action}_btn`}
                onClick={() => {
                  const target = managing;
                  setManaging(null);
                  if (action === 'edit') setEditing(target);
                  else if (action === 'resetpw') setResetting(target);
                  else setDeleting(target);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 4px',
                  cursor: 'pointer',
                  fontSize: 15,
                  color: danger ? 'var(--seam-error)' : 'var(--seam-text-primary)',
                }}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </div>
            ))}
          </>
        )}
      </SeamSheet>

      {/* 비밀번호 재설정 */}
      <SeamSheet
        open={resetting !== null}
        onClose={() => {
          setResetting(null);
          setNewPassword('');
        }}
      >
        {resetting && (
          <>
            <h3 style={{ margin: '4px 0 12px', fontSize: 17 }}>
              {tr('settings.newPasswordTitle', { name: resetting.nickname })}
            </h3>
            <input
              id="resetpw_input"
              className="seam-input"
              type="text"
              value={newPassword}
              placeholder={tr('settings.passwordHint')}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingBottom: 4 }}>
              <button
                className="seam-btn seam-btn--ghost"
                onClick={() => {
                  setResetting(null);
                  setNewPassword('');
                }}
              >
                {tr('common.cancel')}
              </button>
              <button id="resetpw_confirm_btn" className="seam-btn" onClick={() => void resetPassword()}>
                {tr('settings.change')}
              </button>
            </div>
          </>
        )}
      </SeamSheet>

      {/* 삭제 확인 */}
      <SeamSheet open={deleting !== null} onClose={() => setDeleting(null)}>
        {deleting && (
          <>
            <h3 style={{ margin: '4px 0 8px', fontSize: 17 }}>
              {tr('settings.deleteConfirmTitle', { name: deleting.nickname })}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--seam-text-secondary)' }}>
              {tr('settings.deleteConfirmBody')}
            </p>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
              <button className="seam-btn seam-btn--ghost" onClick={() => setDeleting(null)}>
                {tr('common.cancel')}
              </button>
              <button
                id="delete_confirm_btn"
                className="seam-btn"
                style={{ background: 'var(--seam-error)' }}
                onClick={() => void confirmDelete()}
              >
                {tr('common.delete')}
              </button>
            </div>
          </>
        )}
      </SeamSheet>

      {/* 배우자 초대 토큰 */}
      <SeamSheet open={spouseToken !== null} onClose={() => setSpouseToken(null)}>
        {spouseToken !== null && (
          <>
            <h3 style={{ margin: '4px 0 6px', fontSize: 18 }}>{tr('settings.spouseInviteTitle')}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--seam-text-secondary)', lineHeight: 1.5 }}>
              {tr('settings.spouseInviteDesc')}
            </p>
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 'var(--seam-radius-md)',
                background: 'var(--seam-brand-tint-bg)',
                fontSize: 12,
                color: 'var(--seam-brand-point)',
                wordBreak: 'break-all',
              }}
            >
              {spouseToken}
            </div>
            <div style={{ marginTop: 12, paddingBottom: 4 }}>
              <button
                id="spouse_token_copy_btn"
                className="seam-btn"
                onClick={() => {
                  void navigator.clipboard.writeText(spouseToken);
                  setSpouseToken(null);
                  // 가족 초대 시트와 동일한 복사 확인 피드백 (감사 지적 — 불일치 해소)
                  showToast(tr('settings.inviteCodeCopied'));
                }}
              >
                ⧉ {tr('settings.copyInviteCode')}
              </button>
            </div>
          </>
        )}
      </SeamSheet>

      {/* 로그아웃 확인 — 오터치 방지 한 단계 (감사 지적) */}
      <SeamSheet open={logoutConfirm} onClose={() => setLogoutConfirm(false)}>
        <h3 style={{ margin: '4px 0 16px', fontSize: 17 }}>{tr('settings.logoutConfirmTitle')}</h3>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
          <button className="seam-btn seam-btn--ghost" onClick={() => setLogoutConfirm(false)}>
            {tr('common.cancel')}
          </button>
          <button id="logout_confirm_btn" className="seam-btn" onClick={() => logout()}>
            {tr('settings.logout')}
          </button>
        </div>
      </SeamSheet>
    </div>
  );
}

/** 자녀 미니 카드 (시안 C-3) — 틴트 배경 + 이름 + Lv.N + edit → 계정 관리 시트(C-4). */
function ChildMiniCard({
  child,
  warm,
  onTap,
}: {
  child: ChildAccount;
  warm: boolean;
  onTap: () => void;
}) {
  return (
    <div
      id={`child_${child.membershipId}_menu_btn`}
      onClick={onTap}
      style={{
        position: 'relative',
        padding: '14px 8px',
        borderRadius: 'var(--seam-radius-lg)',
        background: warm ? 'var(--seam-child-tint-warm)' : 'var(--seam-brand-tint-bg)',
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          margin: '0 auto',
          borderRadius: '50%',
          background: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          color: 'var(--seam-brand-point)',
        }}
      >
        {child.nickname === '' ? '?' : [...child.nickname][0]}
      </div>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 14,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {child.nickname}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 11.5,
          color: 'var(--seam-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {child.level === null ? child.username : tr('settings.childLevel', { n: `${child.level}` })}
      </p>
      <span
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          fontSize: 12,
          color: 'var(--seam-text-disabled)',
        }}
      >
        ✏️
      </span>
    </div>
  );
}

/** Seamspace Premium 배너 — 시안 C-3 하단 (flag off — 과금 정책 결정 후 활성화). */
function PremiumBanner() {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 'var(--seam-radius-lg)',
        background: 'linear-gradient(90deg, #8c47c2, #f040d6)', // 시안 --ss-grad-premium 근사
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
          {tr('settings.premiumEyebrow')}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#fff' }}>
          {tr('settings.premiumTitle')}
        </p>
      </div>
      <span
        style={{
          padding: '9px 14px',
          borderRadius: 'var(--seam-radius-full)',
          background: '#fff',
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--seam-brand-point)',
        }}
      >
        {tr('settings.premiumCta')}
      </span>
    </div>
  );
}
