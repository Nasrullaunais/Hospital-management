import type { WardType } from '@/shared/types';

export const WARD_TYPES = ['general', 'private', 'icu', 'emergency'] as const;

export type { WardType };

export const ALL_WARD_TYPES: WardType[] = [...WARD_TYPES];
