import type { ImportedCollectibleSnapshot, ImportedTechSnapshot } from './profile-import-types';

export type TechUpgradeRecommendation = {
  id: string;
  priority: number;
  title: string;
  action: string;
  reason: string;
  expectedGainLabel?: string;
  confidence: 'high' | 'medium' | 'low';
};

export type TechRecommendationInput = {
  result: unknown;
  importedTechSnapshot?: ImportedTechSnapshot | null;
  importedCollectibleSnapshot?: ImportedCollectibleSnapshot | null;
  accountContext?: {
    collectionSets?: number;
    collectionStars?: number;
    customCollectionSets?: number;
    targetCollectibleId?: string;
  };
  chipRemainder?: number;
  locale?: string;
};
