// 마음날씨·신호등 글로우 — Flutter theme.dart의 moodWeather()/seamTrafficGlow() 이식.
// 구간은 학생앱 traffic 3단계와 동일 (green ≥5 / yellow ≥-3 / red 그 외).
import { tr } from '../core/i18n/i18n';

export interface MoodWeather {
  emoji: string;
  label: string;
  color: string;
}

export function moodWeather(score: number | null | undefined): MoodWeather {
  if (score === null || score === undefined) {
    return { emoji: '🌫️', label: tr('weather.noNews'), color: 'var(--seam-text-disabled)' };
  }
  if (score >= 5) return { emoji: '☀️', label: tr('weather.sunny'), color: 'var(--seam-success)' };
  if (score >= -3) return { emoji: '⛅', label: tr('weather.cloudy'), color: '#b8860b' };
  return { emoji: '🌧️', label: tr('weather.gloomy'), color: 'var(--seam-error)' };
}

/** 피드 카드 신호등 글로우 — box-shadow 값. null이면 기본 low shadow. */
export function trafficGlow(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'var(--seam-shadow-low)';
  if (score >= 5) return '0 0 8px rgba(107, 214, 0, 0.5)';
  if (score >= -3) return '0 0 8px rgba(255, 234, 42, 0.5)';
  return '0 0 8px rgba(255, 99, 133, 0.35)';
}
