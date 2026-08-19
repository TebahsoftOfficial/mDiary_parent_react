// 마이페이지 '앱 설정' — Flutter app_settings_section.dart 이식 (언어·폰트, 08-10 dev4).
import { useState } from 'react';
import { tr } from '../../../core/i18n/i18n';
import type { Locale } from '../../../core/i18n/i18n';
import { SeamAccordion, SeamSheet, showToast } from '../../../app/ui';
import { appFonts, useAppSettings } from '../../../app/AppSettingsContext';

const LOCALES: [Locale, string][] = [
  ['en', 'English'],
  ['ko', '한국어'],
];

export function AppSettingsSection() {
  const settings = useAppSettings();
  const [langOpen, setLangOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  const currentFont = appFonts.find((f) => f.family === settings.selectedFontFamily) ?? appFonts[0];
  const localeLabel = (LOCALES.find(([code]) => code === settings.locale) ?? LOCALES[0])[1];

  const row = (id: string, icon: string, label: string, value: string, onTap: () => void) => (
    <div
      id={id}
      onClick={onTap}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer' }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <strong style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</strong>
      <span style={{ fontSize: 13, color: 'var(--seam-brand-point)' }}>{value}</span>
      <span style={{ color: 'var(--seam-text-disabled)' }}>›</span>
    </div>
  );

  const pickTile = (id: string, label: string, selected: boolean, onTap: () => void) => (
    <div
      key={id}
      id={id}
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 8px',
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: selected ? 700 : 500,
        color: selected ? 'var(--seam-brand-point)' : 'var(--seam-text-primary)',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {selected && <span>✓</span>}
    </div>
  );

  return (
    <SeamAccordion title={tr('appSettings.title')}>
      {row('app_settings_language_btn', '🌐', tr('appSettings.language'), localeLabel, () =>
        setLangOpen(true),
      )}
      {row(
        'app_settings_font_btn',
        '🔤',
        tr('appSettings.font'),
        currentFont.family === null ? tr('appSettings.fontDefault') : currentFont.label,
        () => setFontOpen(true),
      )}

      <SeamSheet open={langOpen} onClose={() => setLangOpen(false)}>
        <h3 style={{ margin: '4px 0 8px', fontSize: 16 }}>{tr('appSettings.language')}</h3>
        {LOCALES.map(([code, label]) =>
          pickTile(`lang_${code}_btn`, label, settings.locale === code, () => {
            setLangOpen(false);
            settings.setLocale(code);
          }),
        )}
      </SeamSheet>

      <SeamSheet open={fontOpen} onClose={() => setFontOpen(false)}>
        <h3 style={{ margin: '4px 0 8px', fontSize: 16 }}>{tr('appSettings.font')}</h3>
        {appFonts.map((font) =>
          pickTile(
            `font_${font.family ?? 'default'}_btn`,
            font.family === null ? tr('appSettings.fontDefault') : font.label,
            settings.selectedFontFamily === font.family,
            () => {
              setFontOpen(false);
              void settings.setFont(font).then((ok) => {
                if (!ok) showToast(tr('appSettings.fontLoadFailed'));
              });
            },
          ),
        )}
      </SeamSheet>
    </SeamAccordion>
  );
}
