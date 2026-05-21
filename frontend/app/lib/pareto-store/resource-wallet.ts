export type ResourceWalletId =
  | 'techResonanceChips'
  | 'relicArtifactCores'
  | 'survivorAwakeningCores'
  | 'otherworldForgeCores'
  | 'mountCores';

export type ResourceWalletScope = 'tech_spend' | 'account_context';

export interface ResourceWalletField {
  id: ResourceWalletId;
  label: string;
  scope: ResourceWalletScope;
  scopeLabel: string;
  testId: string;
  defaultValue: number;
}

export type ResourceWalletValues = Record<ResourceWalletId, number>;

export const RESOURCE_WALLET_FIELDS: ResourceWalletField[] = [
  {
    id: 'techResonanceChips',
    label: 'Tech resonance chips',
    scope: 'tech_spend',
    scopeLabel: 'Direct tech optimizer spend',
    testId: 'tech-wallet-tech-resonance-chips',
    defaultValue: 40,
  },
  {
    id: 'relicArtifactCores',
    label: 'Relic / artifact cores',
    scope: 'account_context',
    scopeLabel: 'Account context',
    testId: 'tech-wallet-relic-artifact-cores',
    defaultValue: 0,
  },
  {
    id: 'survivorAwakeningCores',
    label: 'Survivor awakening cores',
    scope: 'account_context',
    scopeLabel: 'Account context',
    testId: 'tech-wallet-survivor-awakening-cores',
    defaultValue: 0,
  },
  {
    id: 'otherworldForgeCores',
    label: 'Otherworld / forge cores',
    scope: 'account_context',
    scopeLabel: 'Account context',
    testId: 'tech-wallet-otherworld-forge-cores',
    defaultValue: 0,
  },
  {
    id: 'mountCores',
    label: 'Mount cores',
    scope: 'account_context',
    scopeLabel: 'Account context',
    testId: 'tech-wallet-mount-cores',
    defaultValue: 0,
  },
];

export const DEFAULT_RESOURCE_WALLET_VALUES: ResourceWalletValues = RESOURCE_WALLET_FIELDS.reduce(
  (values, field) => {
    values[field.id] = field.defaultValue;
    return values;
  },
  {} as ResourceWalletValues,
);
