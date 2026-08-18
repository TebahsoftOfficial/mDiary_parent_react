// 홈 탭 서버 상태 — TanStack Query (Flutter FamilyProvider.loadHome 축 대체).
// 일정·쪽지 미읽음은 실패 허용(Flutter와 동일 — 홈이 그것 때문에 죽지 않는다).
import { useQuery } from '@tanstack/react-query';
import { repo } from '../family/repository';

export function useHome(familyId: number) {
  return useQuery({
    queryKey: ['home', familyId],
    queryFn: () => repo.home(familyId),
  });
}

export function useFeed(familyId: number, period: string) {
  return useQuery({
    queryKey: ['feed', familyId, period],
    queryFn: () => repo.feed(familyId, { period }),
  });
}

export function useEvents(familyId: number) {
  const now = new Date();
  return useQuery({
    queryKey: ['events', familyId, now.getFullYear(), now.getMonth() + 1],
    queryFn: () => repo.events(familyId, now.getFullYear(), now.getMonth() + 1),
    retry: false,
  });
}

export function useUnreadMessages(familyId: number) {
  return useQuery({
    queryKey: ['messagesUnread', familyId],
    queryFn: async () => (await repo.messages(familyId, 'received')).unreadCount,
    retry: false,
  });
}
