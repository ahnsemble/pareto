export type ProductProfileWalletImport = Partial<{
  techResonanceChips: number;
  relicArtifactCores: number;
  survivorAwakeningCores: number;
  otherworldForgeCores: number;
  mountCores: number;
}>;

export type ProductProfileTechImport = Partial<{
  chips: number;
  skillSlots: number;
  rarityCounts: Record<string, number>;
}>;

export type ImportedTechSnapshot = {
  parts: Array<{
    partName: string;
    modeName?: string;
    rarity?: string;
    resonance?: number;
    overload?: number;
    deployed?: boolean;
  }>;
  optimizerSettings?: {
    speedMode?: string;
    limit?: string;
    skillSlots?: number;
    chips?: number;
    overloadable?: boolean;
  };
};

export type ImportedCollectibleSnapshot = {
  items: Array<{
    itemIndex: number;
    stars?: number;
    customSetLevel?: number;
  }>;
  customSets?: Array<{
    level?: number;
    itemIndices: number[];
  }>;
};

export type ProductImportCoverage = {
  id: string;
  label: string;
  status: 'imported' | 'missing' | 'needsReview';
  count?: number;
};

export type ProductImportFieldSummary = {
  id: string;
  label: string;
  value: string;
  group: 'Wallet' | 'Tech' | 'Account';
  needsReview?: boolean;
};

type ProductProfileAccountImportShape = {
  selectedHeroId: string;
  targetCollectibleId: string;
  deployedPetId: string;
  assistPet1Id: string;
  assistPet2Id: string;
  selectedMountId: string;
  weaponItemId: string;
  armorItemId: string;
  necklaceItemId: string;
  beltItemId: string;
  glovesItemId: string;
  bootsItemId: string;
  baseAtk: number;
  finalAtk: number;
  atkPercent: number;
  critRate: number;
  critDamage: number;
  skillDamage: number;
  shieldDamage: number;
  poisonedDamage: number;
  weakenedDamage: number;
  chilledDamage: number;
  lacerationDamage: number;
  movementSpeed: number;
  movementSpeedCap: number;
  petAtk: number;
  otherworldPetSyncRate: number;
  collectionSets: number;
  collectionStars: number;
  customCollectionSets: number;
  survivorLevel: number;
  survivorStar: number;
  survivorAwakening: number;
  survivorTeamwork: number;
  survivorPassiveCrit: number;
  petAwakening: number;
  petAssistPets: number;
  petXeno: number;
  petResonanceChance: number;
  petResonanceAtk: number;
  mountCores: number;
  mountPuzzleSlots: number;
  mountStatInputs: number;
  mountAtk: number;
  mountSkillDamage: number;
  equipmentOtherworldCores: number;
  weaponEaf: number;
  weaponVaf: number;
  weaponChaos: number;
  weaponXeno: number;
  armorEaf: number;
  armorVaf: number;
  armorChaos: number;
  armorXeno: number;
  necklaceEaf: number;
  necklaceVaf: number;
  necklaceChaos: number;
  necklaceXeno: number;
  beltEaf: number;
  beltVaf: number;
  beltChaos: number;
  beltXeno: number;
  glovesEaf: number;
  glovesVaf: number;
  glovesChaos: number;
  glovesXeno: number;
  bootsEaf: number;
  bootsVaf: number;
  bootsChaos: number;
  bootsXeno: number;
  lmeTurf: number;
};

export type ProductProfileAccountImport = Partial<ProductProfileAccountImportShape>;

export type ProductProfileAccountStringField = {
  [Key in keyof ProductProfileAccountImportShape]: ProductProfileAccountImportShape[Key] extends string ? Key : never;
}[keyof ProductProfileAccountImportShape];

export type ProductProfileAccountNumberField = {
  [Key in keyof ProductProfileAccountImportShape]: ProductProfileAccountImportShape[Key] extends number ? Key : never;
}[keyof ProductProfileAccountImportShape];

export type ProductProfileImportResult =
  | {
      ok: true;
      wallet: ProductProfileWalletImport;
      tech: ProductProfileTechImport;
      account: ProductProfileAccountImport;
      importedTechSnapshot?: ImportedTechSnapshot;
      importedCollectibleSnapshot?: ImportedCollectibleSnapshot;
      coverage?: ProductImportCoverage[];
      summary: string;
    }
  | {
      ok: false;
      error: string;
    };
