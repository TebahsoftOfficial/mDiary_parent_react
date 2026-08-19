// 마이페이지 옵션 섹션들 — Flutter ai_config_section.dart + permissions_section.dart 이식.
// 값은 Family.option 하나를 공유 — useQuery ['familyOption'] + 낙관적 반영, 실패 시 서버 상태로 복귀.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tr } from '../../../core/i18n/i18n';
import { SeamAccordion, showToast } from '../../../app/ui';
import { useFamilyId } from '../FamilyContext';
import { repo } from '../repository';
import type { Json } from '../models';

function useFamilyOption() {
  const familyId = useFamilyId();
  const queryClient = useQueryClient();
  const option = useQuery({
    queryKey: ['familyOption', familyId],
    queryFn: () => repo.getOption(familyId),
    retry: false,
  });
  const save = async (changes: Json) => {
    // 낙관적 반영
    queryClient.setQueryData<Json>(['familyOption', familyId], (d) => ({ ...d, ...changes }));
    try {
      const saved = await repo.putOption(familyId, changes);
      queryClient.setQueryData(['familyOption', familyId], saved);
    } catch (e) {
      showToast((e as Error).message);
      await option.refetch(); // 서버 상태로 되돌림
    }
  };
  return { option: option.data ?? null, save };
}

/** Writing · AI options — 시안 C-3 (Accordion).
 *  Seams' reply style 3종 + Story length 슬라이더(1000~3000, 500 스텝) + 하루 작성 횟수 2종. */
export function AiConfigSection() {
  const { option, save } = useFamilyOption();
  // 슬라이더 드래그 중 로컬 표시값 (놓을 때 저장 — Flutter onChangeEnd와 동일)
  const [draft, setDraft] = useState<Json>({});
  // 설정 로드 실패는 화면을 막지 않는다 — 섹션만 숨김
  if (option === null) return null;

  // (서버 값, 이모지, 라벨 키) — 서버 값은 번역하지 않는다. 시안: Warm/Balanced/Analytical.
  const personas: [string, string, string][] = [
    ['warm', '🤗', 'aiConfig.personaWarm'],
    ['neutral', '⚖️', 'aiConfig.personaNeutral'],
    ['direct', '🔍', 'aiConfig.personaDirect'],
  ];
  const persona = (option.persona as string | undefined) ?? 'warm';
  // 시안 슬라이더 범위(1000~3000)로 표시 — 범위 밖 기존 값은 표시만 클램프
  const maxlen = Math.min(
    3000,
    Math.max(1000, (draft.diary_maxlen as number | undefined) ?? (option.diary_maxlen as number | undefined) ?? 1000),
  );

  const countSlider = (id: string, labelKey: string, optionKey: string, fallback: number) => {
    const value = Math.min(
      20,
      Math.max(1, (draft[optionKey] as number | undefined) ?? (option[optionKey] as number | undefined) ?? fallback),
    );
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <strong style={{ flex: 1, fontSize: 13.5 }}>{tr(labelKey)}</strong>
          <strong style={{ fontSize: 13, color: 'var(--seam-brand-point)' }}>
            {tr('aiConfig.timesPerDay', { count: `${value}` })}
          </strong>
        </div>
        <input
          id={id}
          type="range"
          min={1}
          max={20}
          step={1}
          value={value}
          onChange={(e) => setDraft((d) => ({ ...d, [optionKey]: Number(e.target.value) }))}
          onMouseUp={() => void save({ [optionKey]: value })}
          onTouchEnd={() => void save({ [optionKey]: value })}
          style={{ width: '100%', accentColor: 'var(--seam-brand)' }}
        />
      </div>
    );
  };

  return (
    <SeamAccordion title={tr('aiConfig.title')}>
      <strong style={{ fontSize: 13.5 }}>{tr('aiConfig.replyStyle')}</strong>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {personas.map(([value, emoji, labelKey]) => {
          const selected = persona === value;
          return (
            <button
              key={value}
              id={`ai_persona_${value}`}
              onClick={() => void save({ persona: value })}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 'var(--seam-radius-md)',
                border: `${selected ? 1.5 : 1}px solid ${selected ? 'var(--seam-brand)' : 'var(--seam-border-subtle)'}`,
                background: selected ? 'var(--seam-brand-tint-bg)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 20 }}>{emoji}</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: selected ? 'var(--seam-brand-point)' : 'var(--seam-text-secondary)',
                }}
              >
                {tr(labelKey)}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
        <strong style={{ flex: 1, fontSize: 13.5 }}>{tr('aiConfig.commentLength')}</strong>
        <strong style={{ fontSize: 13, color: 'var(--seam-brand-point)' }}>
          {tr('aiConfig.charCount', { count: `${maxlen}` })}
        </strong>
      </div>
      <input
        id="ai_maxlen_slider"
        type="range"
        min={1000}
        max={3000}
        step={500}
        value={maxlen}
        onChange={(e) => setDraft((d) => ({ ...d, diary_maxlen: Number(e.target.value) }))}
        onMouseUp={() => void save({ diary_maxlen: maxlen })}
        onTouchEnd={() => void save({ diary_maxlen: maxlen })}
        style={{ width: '100%', accentColor: 'var(--seam-brand)' }}
      />
      <div style={{ display: 'flex', fontSize: 11, color: 'var(--seam-text-disabled)' }}>
        <span style={{ flex: 1 }}>1000</span>
        <span>3000</span>
      </div>
      {/* 하루 작성 횟수 (1~20) — 서버가 자녀 앱의 실제 상한으로 쓴다:
          자녀는 free 플랜이라 그대로 두면 edu 하드코딩(5회)에 걸린다. */}
      {countSlider('ai_max_diary_slider', 'aiConfig.maxDiary', 'max_diary', 5)}
      {countSlider('ai_max_checkin_slider', 'aiConfig.maxCheckin', 'max_checkin', 5)}
    </SeamAccordion>
  );
}

/** Permissions — 시안 C-3 (Accordion). 여기서 끈 것은 자녀의 학생앱에도 그대로 적용된다:
 *  서버(edu_bridge)가 학생앱 그룹옵션 키로 바꿔 실어 보내므로 자녀 앱은 수정 없이 따른다. */
export function PermissionsSection() {
  const { option, save } = useFamilyOption();
  if (option === null) return null;

  const toggles: [string, string, string][] = [
    ['allow_diary', 'settings.permDiary', 'settings.permDiaryDesc'],
    ['allow_checkin', 'settings.permCheckin', 'settings.permCheckinDesc'],
    ['show_lbti', 'settings.permLbti', 'settings.permLbtiDesc'],
    ['show_mental_index', 'settings.permMental', 'settings.permMentalDesc'],
    ['allow_nickname_change', 'settings.permNickname', 'settings.permNicknameDesc'],
    ['allow_letter', 'settings.permLetter', 'settings.permLetterDesc'],
  ];
  return (
    <SeamAccordion title={tr('settings.permissions')}>
      {toggles.map(([key, titleKey, descKey]) => {
        const on = (option[key] as boolean | undefined) ?? true;
        return (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}
          >
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14, fontWeight: 600 }}>{tr(titleKey)}</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--seam-text-secondary)' }}>
                {tr(descKey)}
              </p>
            </div>
            <button
              id={`perm_${key}_toggle`}
              role="switch"
              aria-checked={on}
              onClick={() => void save({ [key]: !on })}
              style={{
                width: 44,
                height: 26,
                flexShrink: 0,
                borderRadius: 'var(--seam-radius-full)',
                border: 'none',
                background: on ? 'var(--seam-brand)' : 'var(--seam-border-subtle)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: on ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 150ms',
                }}
              />
            </button>
          </div>
        );
      })}
    </SeamAccordion>
  );
}
