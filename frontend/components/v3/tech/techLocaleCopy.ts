export type TechOptimizerLocale = 'en' | 'ko';

type WalletFieldId =
  | 'techResonanceChips'
  | 'relicArtifactCores'
  | 'survivorAwakeningCores'
  | 'otherworldForgeCores'
  | 'mountCores';

type WalletFieldCopy = {
  id: WalletFieldId;
  label: string;
  scopeLabel: string;
};

export type TechOptimizerCopy = {
  titleSuffix: string;
  common: {
    none: string;
    unknown: string;
    noPartsSelected: string;
    unavailable: string;
  };
  profileImport: {
    title: string;
    description: string;
    inputLabel: string;
    action: string;
    actionBusy: string;
    clear: string;
    running: string;
    runImported: string;
    imported: string;
    review: string;
    missing: string;
    editableReview: string;
  };
  profileSave: {
    title: string;
    description: string;
    empty: string;
    savedAt: (value: string) => string;
    save: string;
    load: string;
    delete: string;
    preset: string;
    copyShareLink: string;
    copyBackup: string;
    shareUrl: string;
    backup: string;
    copied: string;
    copyManually: string;
    shareLoaded: string;
    shareInvalid: string;
    presetApplied: (slot: string) => string;
    saved: (slot: string) => string;
    loaded: (slot: string) => string;
    deleted: (slot: string) => string;
    unavailable: string;
    missing: (slot: string) => string;
  };
  resourceWallet: {
    title: string;
  };
  dataConfidence: {
    title: string;
    levels: Record<'high' | 'medium' | 'low', string>;
  };
  inventory: {
    title: string;
    subtitle: string;
    valid: string;
    validWithWarnings: (warnings: string) => string;
    blocked: (errors: string) => string;
    labels: {
      chips: string;
      activeSkills: string;
      searchDepth: string;
      inputMode: string;
      overload: string;
      overloadCap: string;
    };
  };
  skill: {
    title: string;
    status: Record<'auto' | 'locked' | 'disabled', string>;
  };
  account: {
    title: string;
    selectedSurvivorFallback: string;
    petFallback: string;
    selectedCollectibleFallback: string;
    selectedMountFallback: string;
    selectedTargetPrefix: string;
    summary: {
      finalAtk: string;
      crit: string;
      conditions: string;
      review: string;
    };
    labels: Record<string, string>;
  };
  search: {
    title: string;
    topBuilds: string;
    run: string;
    running: string;
    failed: string;
  };
  results: {
    title: string;
    topBuild: string;
    empty: string;
    firstAnswer: string;
    visited: string;
    chipsUsed: string;
    chipsLeft: string;
    activeSkills: string;
    comparison: {
      title: string;
      imported: string;
      tangtang: string;
      delta: string;
      explanation: string;
      unchanged: string;
      unavailable: string;
    };
    table: {
      build: string;
      score: string;
      damage: string;
      parts: string;
    };
    buildLabel: (index: number) => string;
    summaryLine: (chipsUsed: string, chipsLeft: string, activeSkills: string) => string;
    chipAllocation: (value: string) => string;
    overload: (value: string) => string;
  };
  recommendations: {
    title: string;
    empty: string;
    why: string;
    confidence: string;
    confidenceLevels: Record<'high' | 'medium' | 'low', string>;
  };
  impact: {
    title: string;
    empty: string;
    item: string;
    current: string;
    recommended: string;
    beforeDamage: string;
    afterDamage: string;
    expectedGain: string;
    basis: string;
  };
};

const EN_COPY: TechOptimizerCopy = {
  titleSuffix: 'tech parts',
  common: {
    none: 'none',
    unknown: 'Unknown',
    noPartsSelected: 'No parts selected',
    unavailable: 'n/a',
  },
  profileImport: {
    title: 'tanggall profile import',
    description: 'Paste a profile JSON, calculation link, or screenshot text to fill this optimizer.',
    inputLabel: 'Profile JSON, calculation link, or screenshot text',
    action: 'Import profile',
    actionBusy: 'Importing...',
    clear: 'Clear import',
    running: 'Running',
    runImported: 'Run imported profile',
    imported: 'Imported',
    review: 'Needs review',
    missing: 'Missing',
    editableReview: 'Editable after import. Confirm marked fields before running.',
  },
  profileSave: {
    title: 'Saved profiles',
    description: 'Keep separate inputs for each game mode on this browser.',
    empty: 'Not saved',
    savedAt: (value) => `Saved ${value}`,
    save: 'Save',
    load: 'Load',
    delete: 'Delete',
    preset: 'Preset',
    copyShareLink: 'Copy share link',
    copyBackup: 'Copy backup',
    shareUrl: 'Share URL',
    backup: 'Backup',
    copied: 'Copied to clipboard.',
    copyManually: 'Copy manually.',
    shareLoaded: 'Share link loaded.',
    shareInvalid: 'Share link is invalid.',
    presetApplied: (slot) => `${slot} preset applied.`,
    saved: (slot) => `${slot} saved.`,
    loaded: (slot) => `${slot} loaded. Run again for fresh results.`,
    deleted: (slot) => `${slot} deleted.`,
    unavailable: 'Browser storage is unavailable.',
    missing: (slot) => `${slot} has no saved profile yet.`,
  },
  resourceWallet: {
    title: 'Resource wallet',
  },
  dataConfidence: {
    title: 'Data confidence',
    levels: {
      high: 'high',
      medium: 'medium',
      low: 'low',
    },
  },
  inventory: {
    title: 'Owned tech materials',
    subtitle: 'Sub-parts excluding equipped main parts',
    valid: 'Inventory valid',
    validWithWarnings: (warnings) => `Inventory valid / ${warnings}`,
    blocked: (errors) => `Inventory blocked / ${errors}`,
    labels: {
      chips: 'Tech resonance chips',
      activeSkills: 'Active skills',
      searchDepth: 'Search depth',
      inputMode: 'Input mode',
      overload: 'Overload',
      overloadCap: 'Overload cap',
    },
  },
  skill: {
    title: 'Skill constraints',
    status: {
      auto: 'Auto',
      locked: 'Locked',
      disabled: 'Excluded',
    },
  },
  account: {
    title: 'Account context',
    selectedSurvivorFallback: 'Selected survivor',
    petFallback: 'Pet',
    selectedCollectibleFallback: 'None',
    selectedMountFallback: 'Mount',
    selectedTargetPrefix: 'Selected target',
    summary: {
      finalAtk: 'Final ATK',
      crit: 'Crit',
      conditions: 'Conditions',
      review: 'Needs review',
    },
    labels: {
      mode: 'Mode',
      buildStats: 'Build stats',
      baseAtk: 'Base ATK',
      finalAtk: 'Final ATK',
      atkPercent: 'ATK %',
      critRate: 'Crit rate',
      critDamage: 'Crit damage',
      skillDamage: 'Skill damage',
      damageConditions: 'Damage conditions',
      guildExpedition: 'Guild Expedition context',
      guildExpeditionDetail: 'Shown only for the Guild Expedition slot.',
      guildExpeditionTestaments: 'Expedition testaments',
      guildExpeditionDebuff: 'Debuff adjustment',
      shieldDamage: 'Shield damage',
      poisonedTarget: 'Poisoned target',
      weakenedTarget: 'Weakened target',
      chilledTarget: 'Chilled target',
      laceratedTarget: 'Lacerated target',
      collections: 'Collections',
      collectionDetail: 'Collection detail',
      setProgress: 'Set progress',
      setStars: 'Set stars',
      customSets: 'Custom sets',
      collectorHeart: 'Collector heart',
      targetCollectible: 'Target collectible',
      selectedSurvivor: 'Selected survivor',
      selectedMount: 'Selected mount',
      selectedTarget: 'Selected target',
      set: 'Set',
      survivors: 'Survivors',
      survivorDetail: 'Survivor detail',
      level: 'Level',
      star: 'Star',
      awakening: 'Awakening',
      teamworkSlots: 'Teamwork slots',
      passiveCritRate: 'Passive crit rate',
      main: 'Main',
      teamwork: 'Teamwork',
      teamworkPassive: 'Teamwork passive',
      passiveCrit: 'Passive crit',
      petAwakening: 'Pet awakening',
      petDetail: 'Pet detail',
      assistPets: 'Assist pets',
      xeno: 'Xeno',
      resonanceChance: 'Resonance chance',
      resonanceAtk: 'Resonance ATK',
      mainPet: 'Main pet',
      deployedPet: 'Deployed pet',
      assist1: 'Assist 1',
      assist2: 'Assist 2',
      movementAndPetTotals: 'Movement and pet totals',
      petAtk: 'Pet ATK',
      otherworldPetSync: 'Otherworld pet sync',
      movementSpeed: 'Movement speed',
      movementSpeedCap: 'Movement speed cap',
      mounts: 'Mounts',
      mountDetail: 'Mount detail',
      mountCores: 'Mount cores',
      puzzleSlots: 'Puzzle slots',
      mountStatInputs: 'Mount stat inputs',
      mountAtk: 'Mount ATK %',
      mountSkillDamage: 'Mount skill %',
      puzzle: 'Puzzle',
      equipmentForging: 'Equipment forging',
      sixSlotEquipment: 'Six-slot equipment',
      otherworldForgeCores: 'Otherworld / forge cores',
      weapon: 'Weapon',
      armor: 'Armor',
      necklace: 'Necklace',
      belt: 'Belt',
      gloves: 'Gloves',
      boots: 'Boots',
      item: 'Item',
      designs: 'Designs',
      lunarMine: 'Lunar Mine',
      turfNodes: 'Turf nodes',
      phase: 'Phase',
      playerMedals: 'Player medals',
      opponentMedals: 'Opponent medals',
    },
  },
  search: {
    title: 'Search',
    topBuilds: 'Top builds',
    run: 'Run',
    running: 'Running',
    failed: 'Optimizer run failed. Try different inputs.',
  },
  results: {
    title: 'Ranked tech builds',
    topBuild: 'Top build',
    empty: 'Run the optimizer to compare builds.',
    firstAnswer: 'First answer',
    visited: 'Visited',
    chipsUsed: 'Chips used',
    chipsLeft: 'Chips left',
    activeSkills: 'Active skills',
    comparison: {
      title: 'Calculation comparison',
      imported: 'Imported calculation',
      tangtang: 'tanggall calculation',
      delta: 'Difference',
      explanation: 'Why the numbers differ',
      unchanged: 'No change',
      unavailable: 'Run an imported profile to compare calculations.',
    },
    table: {
      build: 'Build',
      score: 'Score',
      damage: 'Damage',
      parts: 'Parts',
    },
    buildLabel: (index) => `Build ${index + 1}`,
    summaryLine: (chipsUsed, chipsLeft, activeSkills) =>
      `Chips used ${chipsUsed} · Chips left ${chipsLeft} · Active skills ${activeSkills}`,
    chipAllocation: (value) => `Chip allocation ${value}`,
    overload: (value) => `Overload ${value}`,
  },
  recommendations: {
    title: 'Next upgrades',
    empty: 'Run the optimizer to see upgrade recommendations.',
    why: 'Why this recommendation',
    confidence: 'Confidence',
    confidenceLevels: {
      high: 'high',
      medium: 'medium',
      low: 'low',
    },
  },
  impact: {
    title: 'Before / After impact',
    empty: 'Run an imported profile to see positive before/after upgrade impact here.',
    item: 'Change',
    current: 'Current',
    recommended: 'Recommended',
    beforeDamage: 'Before damage',
    afterDamage: 'After damage',
    expectedGain: 'Expected gain',
    basis: 'Basis',
  },
};

const KO_COPY: TechOptimizerCopy = {
  titleSuffix: '테크 파츠',
  common: {
    none: '없음',
    unknown: '알 수 없음',
    noPartsSelected: '선택된 파츠 없음',
    unavailable: '없음',
  },
  profileImport: {
    title: 'tanggall 프로필 가져오기',
    description: '프로필 JSON, 계산 링크 또는 스크린샷 텍스트를 붙여 넣으면 최적화 입력을 채웁니다.',
    inputLabel: '프로필 JSON, 계산 링크 또는 스크린샷 텍스트',
    action: '프로필 가져오기',
    actionBusy: '가져오는 중...',
    clear: '가져오기 지우기',
    running: '계산 중',
    runImported: '가져온 프로필 계산',
    imported: '가져옴',
    review: '확인 필요',
    missing: '누락',
    editableReview: '가져온 뒤에도 수정할 수 있습니다. 표시된 항목은 직접 확인한 뒤 계산하세요.',
  },
  profileSave: {
    title: '저장 프로필',
    description: '이 브라우저에 모드별 입력값을 따로 보관합니다.',
    empty: '저장 없음',
    savedAt: (value) => `저장됨 ${value}`,
    save: '저장',
    load: '불러오기',
    delete: '삭제',
    preset: '프리셋',
    copyShareLink: '공유 링크 복사',
    copyBackup: '백업 복사',
    shareUrl: '공유 URL',
    backup: '백업',
    copied: '클립보드에 복사됨.',
    copyManually: '직접 복사하세요.',
    shareLoaded: '공유 링크 불러옴.',
    shareInvalid: '공유 링크가 올바르지 않습니다.',
    presetApplied: (slot) => `${slot} 프리셋 적용 완료.`,
    saved: (slot) => `${slot} 저장 완료.`,
    loaded: (slot) => `${slot} 불러옴. 최신 결과는 다시 계산하세요.`,
    deleted: (slot) => `${slot} 삭제 완료.`,
    unavailable: '브라우저 저장소를 사용할 수 없습니다.',
    missing: (slot) => `${slot} 저장값이 없습니다.`,
  },
  resourceWallet: {
    title: '리소스 지갑',
  },
  dataConfidence: {
    title: '데이터 신뢰도',
    levels: {
      high: '높음',
      medium: '중간',
      low: '낮음',
    },
  },
  inventory: {
    title: '보유 테크 재료',
    subtitle: '착용 중인 메인 파츠를 제외한 서브 파츠',
    valid: '인벤토리 정상',
    validWithWarnings: (warnings) => `인벤토리 정상 / ${warnings}`,
    blocked: (errors) => `인벤토리 확인 필요 / ${errors}`,
    labels: {
      chips: '기술 공명 칩',
      activeSkills: '활성 스킬',
      searchDepth: '탐색 깊이',
      inputMode: '입력 모드',
      overload: '오버로드',
      overloadCap: '오버로드 한도',
    },
  },
  skill: {
    title: '스킬 조건',
    status: {
      auto: '자동',
      locked: '고정',
      disabled: '제외',
    },
  },
  account: {
    title: '계정 컨텍스트',
    selectedSurvivorFallback: '선택 특공대',
    petFallback: '펫',
    selectedCollectibleFallback: '없음',
    selectedMountFallback: '탈것',
    selectedTargetPrefix: '선택 목표',
    summary: {
      finalAtk: '최종 ATK',
      crit: '치명',
      conditions: '조건',
      review: '확인 필요',
    },
    labels: {
      mode: '모드',
      buildStats: '빌드 스탯',
      baseAtk: '기본 ATK',
      finalAtk: '최종 ATK',
      atkPercent: 'ATK %',
      critRate: '치명타 확률',
      critDamage: '치명타 피해',
      skillDamage: '스킬 피해',
      damageConditions: '피해 조건',
      guildExpedition: '길드원정 컨텍스트',
      guildExpeditionDetail: '길드원정 슬롯에서만 적용되는 디버프/보정입니다.',
      guildExpeditionTestaments: '길드원정 증표 수',
      guildExpeditionDebuff: '디버프 보정',
      shieldDamage: '보호막 피해',
      poisonedTarget: '중독 대상',
      weakenedTarget: '약화 대상',
      chilledTarget: '빙결 대상',
      laceratedTarget: '열상 대상',
      collections: '수집품',
      collectionDetail: '수집품 상세',
      setProgress: '세트 진행도',
      setStars: '세트 별',
      customSets: '커스텀 세트',
      collectorHeart: '수집가 하트',
      targetCollectible: '목표 수집품',
      selectedSurvivor: '선택 특공대',
      selectedMount: '선택 탈것',
      selectedTarget: '선택 목표',
      set: '세트',
      survivors: '특공대',
      survivorDetail: '특공대 상세',
      level: '레벨',
      star: '별',
      awakening: '각성',
      teamworkSlots: '팀워크 슬롯',
      passiveCritRate: '패시브 치명타 확률',
      main: '메인',
      teamwork: '팀워크',
      teamworkPassive: '팀워크 패시브',
      passiveCrit: '패시브 치명',
      petAwakening: '펫 각성',
      petDetail: '펫 상세',
      assistPets: '지원 펫',
      xeno: 'Xeno',
      resonanceChance: '공명 확률',
      resonanceAtk: '공명 ATK',
      mainPet: '메인 펫',
      deployedPet: '출전 펫',
      assist1: '지원 1',
      assist2: '지원 2',
      movementAndPetTotals: '이동 및 펫 합산',
      petAtk: '펫 ATK',
      otherworldPetSync: '이세계 펫 동조',
      movementSpeed: '이동 속도',
      movementSpeedCap: '이동 속도 상한',
      mounts: '탈것',
      mountDetail: '탈것 상세',
      mountCores: '탈것 코어',
      puzzleSlots: '퍼즐 슬롯',
      mountStatInputs: '탈것 스탯 입력',
      mountAtk: '탈것 ATK %',
      mountSkillDamage: '탈것 스킬 %',
      puzzle: '퍼즐',
      equipmentForging: '장비 제련',
      sixSlotEquipment: '6부위 장비',
      otherworldForgeCores: '이세계 / 제련 코어',
      weapon: '무기',
      armor: '갑옷',
      necklace: '목걸이',
      belt: '벨트',
      gloves: '장갑',
      boots: '신발',
      item: '아이템',
      designs: '도면',
      lunarMine: '루나 광산',
      turfNodes: '터프 노드',
      phase: '페이즈',
      playerMedals: '내 메달',
      opponentMedals: '상대 메달',
    },
  },
  search: {
    title: '탐색',
    topBuilds: '상위 빌드',
    run: '계산',
    running: '계산 중',
    failed: '최적화 실행에 실패했습니다. 다른 입력으로 다시 시도하세요.',
  },
  results: {
    title: '랭킹 테크 빌드',
    topBuild: '최상위 빌드',
    empty: '최적화를 실행해 빌드를 비교하세요.',
    firstAnswer: '첫 결과',
    visited: '탐색 수',
    chipsUsed: '사용 칩',
    chipsLeft: '남은 칩',
    activeSkills: '활성 스킬',
    comparison: {
      title: '계산 비교',
      imported: '가져온 계산',
      tangtang: 'tanggall 계산',
      delta: '차이',
      explanation: '차이가 나는 이유',
      unchanged: '변화 없음',
      unavailable: '가져온 프로필을 계산하면 비교가 표시됩니다.',
    },
    table: {
      build: '빌드',
      score: '점수',
      damage: '피해',
      parts: '파츠',
    },
    buildLabel: (index) => `빌드 ${index + 1}`,
    summaryLine: (chipsUsed, chipsLeft, activeSkills) =>
      `사용 칩 ${chipsUsed} · 남은 칩 ${chipsLeft} · 활성 스킬 ${activeSkills}`,
    chipAllocation: (value) => `칩 배분 ${value}`,
    overload: (value) => `오버로드 ${value}`,
  },
  recommendations: {
    title: '다음 업그레이드',
    empty: '최적화를 실행하면 업그레이드 추천을 볼 수 있습니다.',
    why: '추천 이유',
    confidence: '신뢰도',
    confidenceLevels: {
      high: '높음',
      medium: '중간',
      low: '낮음',
    },
  },
  impact: {
    title: '비포 / 애프터 영향',
    empty: '가져온 프로필을 계산하면 양수 개선이 확인된 비포/애프터 영향만 여기에 표시됩니다.',
    item: '변경 항목',
    current: '현재',
    recommended: '추천',
    beforeDamage: '기존 피해',
    afterDamage: '추천 후 피해',
    expectedGain: '예상 상승량',
    basis: '기준',
  },
};

const COPIES: Record<TechOptimizerLocale, TechOptimizerCopy> = {
  en: EN_COPY,
  ko: KO_COPY,
};

const WALLET_FIELDS: Record<TechOptimizerLocale, WalletFieldCopy[]> = {
  en: [
    { id: 'techResonanceChips', label: 'Tech resonance chips', scopeLabel: 'Direct tech optimizer spend' },
    { id: 'relicArtifactCores', label: 'Relic / artifact cores', scopeLabel: 'Account context' },
    { id: 'survivorAwakeningCores', label: 'Survivor awakening cores', scopeLabel: 'Account context' },
    { id: 'otherworldForgeCores', label: 'Otherworld / forge cores', scopeLabel: 'Account context' },
    { id: 'mountCores', label: 'Mount cores', scopeLabel: 'Account context' },
  ],
  ko: [
    { id: 'techResonanceChips', label: '기술 공명 칩', scopeLabel: '테크 최적화 지출' },
    { id: 'relicArtifactCores', label: '유물 / 아티팩트 코어', scopeLabel: '계정 컨텍스트' },
    { id: 'survivorAwakeningCores', label: '특공대 각성 코어', scopeLabel: '계정 컨텍스트' },
    { id: 'otherworldForgeCores', label: '이세계 / 제련 코어', scopeLabel: '계정 컨텍스트' },
    { id: 'mountCores', label: '탈것 코어', scopeLabel: '계정 컨텍스트' },
  ],
};

export type TechEntityNameKind =
  | 'collectibleItem'
  | 'collectibleSet'
  | 'hero'
  | 'pet'
  | 'mount'
  | 'equipment'
  | 'techPart';

const KO_ENTITY_NAME_OVERRIDES: Record<TechEntityNameKind, Record<string, string>> = {
  collectibleItem: {
    'Atomic Mech': '아토믹 메카',
    'Time Essence Bottle': '시간 정수 병',
    'Life Hourglass': '생명의 모래시계',
    'Dimension Foil': '차원 포일',
    'Super Circuit Board': '슈퍼 회로 기판',
    'Comms Conch': '통신 소라',
    'Memory Editor': '기억 편집기',
    'Temporal Rewinder': '시간 되감개',
    'Spatial Rewinder': '공간 되감개',
    'Holodream Fluid': '홀로드림 유체',
    'Dragon Tooth': '용의 이빨',
    'Hyper Neuron': '하이퍼 뉴런',
    'Cyber Totem': '사이버 토템',
    'Dreamscape Puzzle': '몽경 퍼즐',
    'Gene Splicer': '유전자 접합기',
    'Instellar Transition Matrix Design': '성간 전이 매트릭스 설계도',
    'High-Lat Energy Cube': '고위도 에너지 큐브',
    'Mental Sync Helm': '정신 동조 투구',
    'Dice of Destiny': '운명의 주사위',
    'Hydraulic Flipper': '유압 지느러미',
    'Klein Bottle': '클라인 병',
    'Wildfire Furnace': '들불 용광로',
    'Wormhole Detector': '웜홀 탐지기',
    'Mini Dyson Sphere': '소형 다이슨 구',
    'Star-Rail Passenger Card': '성간철도 승차권',
    'Shuttle Capsule': '셔틀 캡슐',
    'Neurochip': '뉴로칩',
    'Anti-Gravity Device': '반중력 장치',
    'Portable Mech Case': '휴대용 메카 케이스',
    'Dark Matter Construct': '암흑물질 구조체',
    'Timeline Cube': '타임라인 큐브',
    'Omni-Symbiote': '옴니 공생체',
    'Plasma Sword': '플라즈마 검',
    'Geocore Orb': '지오코어 오브',
    'Aquacore Orb': '아쿠아코어 오브',
    'Pyrocore Orb': '파이로코어 오브',
    'Aerocore Orb': '에어로코어 오브',
    'Nuclear Battery': '핵 배터리',
    'Old Medical Book': '오래된 의학서',
    "Savior's Memento": '구원자의 유품',
    'Tablet of Epics': '서사시 석판',
    'Primordial War Drum': '태초의 전쟁 북',
    'Flaming Plume': '불타는 깃털',
    'Astral Dewdrop': '성운 이슬',
    'Antiparticle Gourd': '반입자 호리병',
    'Micro Artificial Sun': '초소형 인공태양',
    'Nano-Mimetic Mask': '나노 모방 마스크',
    'Clone Mirror': '복제 거울',
    'Cosmic Compass': '우주 나침반',
    'Infinity Score': '무한 악보',
    'Angelic Tear Crystal': '천사의 눈물 결정',
    'Otherworld Key': '이세계 열쇠',
    'Human Genome Mapping': '인간 게놈 지도',
    'Book of Ancient Wisdom': '고대 지혜의 서',
    'Starcore Diamond': '별핵 다이아몬드',
    'Immortal Lucky Coin': '불멸의 행운 동전',
    "Unicorn's Horn": '유니콘의 뿔',
    'Void Bloom': '공허의 꽃',
    'Eye of True Vision': '진실의 눈',
    'Mystical Halo': '신비한 후광',
    'Lucky Charm': '행운 부적',
    "Prophet's Tarot": '예언자의 타로',
    'Golden Cutlery': '황금 식기',
    'Safehouse Map': '안전가옥 지도',
    "Scientific Luminary's Journal": '과학 거장의 일지',
    'Golden Horn': '황금 뿔',
    'Elemental Ring': '원소 반지',
    'Superhuman Pill': '초인 알약',
    'Aquarius Starlight': '물병자리 별빛',
    'Pisces Starlight': '물고기자리 별빛',
    'Aries Starlight': '양자리 별빛',
    'Taurus Starlight': '황소자리 별빛',
    'Gemini Starlight': '쌍둥이자리 별빛',
    'Cancer Starlight': '게자리 별빛',
    'Leo Starlight': '사자자리 별빛',
    'Virgo Starlight': '처녀자리 별빛',
  },
  collectibleSet: {
    'Impression Idols': '인상 아이돌',
    'Open Void Gate': '열린 공허의 문',
    'Close to Creation': '창조에 가까운',
    'Hyperrift Tech': '초차원 균열 기술',
    'Realizing Childhood Dreams': '어릴 적 꿈의 실현',
    'Summon the Divine Dragon': '신룡 소환',
    'Erudite Heirloom': '박식한 가보',
    'Conduct Experiments': '실험 수행',
    'Otherworld Treasure': '이세계 보물',
    'Meaning of Life': '생명의 의미',
    'Interdimension Movement': '차원 간 이동',
    'Transgalactic Tentacle': '은하 횡단 촉수',
    'Multiverse Perspective': '다중우주 관점',
    "Rewriting the Stars' Memories": '별의 기억 다시 쓰기',
    'Goldfinger': '골드핑거',
    'Cyber Wonderland': '사이버 원더랜드',
    'Summon the Stand-in!': '대역 소환!',
    'Try all possibilities': '모든 가능성 시도',
    'Brewing Recipe': '양조 레시피',
    'Wind Totem': '바람 토템',
    'When Cosmic Stars Shine': '우주의 별이 빛날 때',
    'Genesis': '제네시스',
    'Luck Through the Roof': '하늘을 찌르는 행운',
    'First Myth': '첫 번째 신화',
    'Parallel Dimension': '평행 차원',
    'Uncontrollable Superpower': '제어 불가 초능력',
    'Just Enough to Ignore the Fog': '안개를 무시할 만큼',
    'Merfolk Disguise Attempt': '인어 변장 시도',
    'Drones are Safest': '드론이 가장 안전',
    'Unbreakable': '불굴',
    'Extraterrestrial Ritual': '외계 의식',
    'Dreamseeker Voyage': '꿈추적자 항해',
    'Deleted Memories': '삭제된 기억',
    'Inescapable': '피할 수 없음',
    'Dream or Reality?': '꿈인가 현실인가?',
    'Life Reboot Device': '생명 재부팅 장치',
    'Corner of the Universe I': '우주의 한구석 I',
    'Corner of the Universe III': '우주의 한구석 III',
  },
  hero: {
    Common: '커먼',
    King: '킹',
    'Master Yang': '마스터 양',
    Metalia: '메탈리아',
    Joey: '조이',
    Taloxa: '탈록사',
    Venato: '베나토',
    Worm: '웜',
    April: '에이프릴',
    Splinter: '스플린터',
    Raphael: '라파엘',
    Donatello: '도나텔로',
    Leonardo: '레오나르도',
    Michelangelo: '미켈란젤로',
    Tsukuyomi: '츠쿠요미',
    Wesson: '웨슨',
    Yelena: '옐레나',
    Catnips: '캣닙스',
    Squidward: '징징이',
    SpongeBob: '스폰지밥',
    Sandy: '샌디',
    Patrick: '패트릭',
    Nezha: '나타',
  },
  pet: {
    Rex: '렉스',
    Croaky: '크로키',
    Gary: '게리',
    Capy: '캐피',
    Clucker: '클러커',
    Puffo: '퍼포',
    Blizzblast: '블리즈블래스트',
    Nutjob: '넛잡',
    Gourmeow: '구르먀우',
  },
  mount: {
    Doomsteed: '둠스티드',
    'Electric Scooter': '전동 스쿠터',
    'Tech Hoverboard': '테크 호버보드',
  },
  equipment: {
    'Twin Lance': '트윈 랜스',
    'Void Power': '파괴의 힘',
    'Sword of Disorder': '혼돈의 검',
    Lightchaser: '빛을 쫓는 자',
    Kunai: '쿠나이',
    'Baseball Bat': '야구빠따',
    Katana: '카타나',
    Shotgun: '산탄총',
    Revolver: '리볼버',
    'Eternal Suit': '이터널 슈트',
    'Evervoid Armor': '에버보이드 아머',
    'Judgment Necklace': '심판 목걸이',
    'Voidwaker Emblem': '보이드워커 엠블럼',
    'Twisting Belt': '트위스팅 벨트',
    'Stardust Sash': '스타더스트 새시',
    'Moonscar Bracer': '문스카 브레이서',
    'Voidwaker Handguards': '보이드워커 핸드가드',
    'Glacial Warboots': '빙하 전투화',
    'Voidwaker Treads': '보이드워커 트레드',
  },
  techPart: {
    'Energy Guidance System': '에너지 유도 시스템',
    'Antimatter Maintainer': '반물질 유지장치',
    'Quantum Nanobot': '양자 나노봇',
    'Phase Driver': '위상 드라이버',
    'Energy Diffuser': '에너지 디퓨저',
    'Hi-Maintainer': '고성능 유지장치',
    'Precision Device': '정밀 장치',
    'Antimatter Generator': '반물질 생성기',
    'Exo-radicator': '엑소 제거기',
    'Hi-Gravity Pulser': '고중력 펄서',
    Drone: '드론',
    Molotov: '화염병',
    Drill: '드릴',
    Rocket: '로켓',
    Durian: '두리안',
    Soccer: '축구공',
    Forcefield: '방어막',
    'Drill Shot': '드릴샷',
    Lightning: '번개',
    Boomerang: '부메랑',
    'Energy Cube': '에너지 큐브',
    'HP Bullet': 'HP 탄환',
    'Exo Bracer': '외골격 브레이서',
    'Ammo Thruster': '탄약 추진기',
    'HE Fuel': '고성능 연료',
    Guardian: '수호자',
    Laser: '레이저',
    Brick: '벽돌',
    'Molotov Mode': '화염병 모드',
    'Durian Mode': '두리안 모드',
    'Soccer Mode': '축구공 모드',
    'Drone Mode': '드론 모드',
    'Forcefield Mode': '방어막 모드',
    'Drill Shot Mode': '드릴샷 모드',
    'Rocket Mode': '로켓 모드',
    'Lightning Mode': '번개 모드',
    'Boomerang Mode': '부메랑 모드',
    'Guardian Mode': '수호자 모드',
    'Laser Mode': '레이저 모드',
    'Brick Mode': '벽돌 모드',
  },
};

export const PENDING_KO_ENTITY_NAME_KEYS: Record<TechEntityNameKind, string[]> = {
  collectibleItem: ['Event 1-42'],
  collectibleSet: [],
  hero: [],
  pet: [],
  mount: [],
  equipment: [],
  techPart: [],
};

export function localizeTechEntityName(
  kind: TechEntityNameKind,
  value: string,
  locale: string | undefined,
): string {
  const normalized = normalizeTechOptimizerLocale(locale);
  if (normalized === 'en') return value;
  return KO_ENTITY_NAME_OVERRIDES[kind]?.[value] ?? value;
}

const INVENTORY_MESSAGES: Record<string, Record<TechOptimizerLocale, string>> = {
  'overload.max_requires_overloadable': {
    en: 'Max overload is only used when Overload is enabled',
    ko: '오버로드 한도는 오버로드가 켜져 있을 때만 사용됩니다',
  },
  'overload.max_gt_18': {
    en: 'Overload cap must be 18 or lower',
    ko: '오버로드 한도는 18 이하여야 합니다',
  },
  'overload.max_too_high': {
    en: 'Max overload must be 18 or lower',
    ko: '오버로드 한도는 18 이하여야 합니다',
  },
  'chips.gt_999': {
    en: 'Tech resonance chips must be 999 or lower',
    ko: '기술 공명 칩은 999 이하여야 합니다',
  },
  'chips.too_high': {
    en: 'Tech resonance chips must be 999 or lower',
    ko: '기술 공명 칩은 999 이하여야 합니다',
  },
  'skill_slots.lt_1': {
    en: 'Active skills must be at least 1',
    ko: '활성 스킬은 최소 1개여야 합니다',
  },
  'skill_slots.too_low': {
    en: 'Skill slots must be at least 1',
    ko: '스킬 슬롯은 최소 1개여야 합니다',
  },
  'skill_slots.gt_6': {
    en: 'Active skills must be 6 or lower',
    ko: '활성 스킬은 6개 이하여야 합니다',
  },
  'skill_slots.too_high': {
    en: 'Skill slots must be 6 or lower',
    ko: '스킬 슬롯은 6개 이하여야 합니다',
  },
  wasm_pending: {
    en: 'WASM is still loading',
    ko: '계산 엔진을 불러오는 중입니다',
  },
};

const IMPORT_SUMMARY_PHRASES: Record<string, Record<TechOptimizerLocale, string>> = {
  'Imported wallet': { en: 'Imported wallet', ko: '지갑 가져옴' },
  'Imported tech inventory': { en: 'Imported tech inventory', ko: '테크 인벤토리 가져옴' },
  'Imported account context': { en: 'Imported account context', ko: '계정 컨텍스트 가져옴' },
  'Imported calculation link': { en: 'Imported calculation link', ko: '계산 링크 가져옴' },
  'Imported screenshot text': { en: 'Imported screenshot text', ko: '스크린샷 텍스트 가져옴' },
  'Profile imported': { en: 'Profile imported', ko: '프로필 가져옴' },
  'Profile import failed. Check the link or JSON and try again.': {
    en: 'Profile import failed. Check the link or JSON and try again.',
    ko: '프로필을 가져오지 못했습니다. 링크나 JSON을 확인하고 다시 시도하세요.',
  },
};

const FIELD_LABELS: Record<string, Record<TechOptimizerLocale, string>> = {
  'Build stats': { en: 'Build stats', ko: '빌드 스탯' },
  'Tech inventory': { en: 'Tech inventory', ko: '테크 인벤토리' },
  Collectibles: { en: 'Collectibles', ko: '수집품' },
  'Optimizer settings': { en: 'Optimizer settings', ko: '최적화 설정' },
  Equipment: { en: 'Equipment', ko: '장비' },
  'Account context': { en: 'Account context', ko: '계정 컨텍스트' },
  'Profile domains': { en: 'Profile domains', ko: '프로필 영역' },
  'Screenshot build stats': { en: 'Screenshot build stats', ko: '스크린샷 빌드 스탯' },
  'Screenshot core inventory': { en: 'Screenshot core inventory', ko: '스크린샷 코어 보유량' },
  'Screenshot extra stats': { en: 'Screenshot extra stats', ko: '스크린샷 추가 스탯' },
  'Tech resonance chips': { en: 'Tech resonance chips', ko: '기술 공명 칩' },
  'Relic / artifact cores': { en: 'Relic / artifact cores', ko: '유물 / 아티팩트 코어' },
  'Survivor awakening cores': { en: 'Survivor awakening cores', ko: '특공대 각성 코어' },
  'Otherworld / forge cores': { en: 'Otherworld / forge cores', ko: '이세계 / 제련 코어' },
  'Mount cores': { en: 'Mount cores', ko: '탈것 코어' },
  'Optimizer chips': { en: 'Optimizer chips', ko: '최적화 칩' },
  'Active skills': { en: 'Active skills', ko: '활성 스킬' },
  'Tech rarity counts': { en: 'Tech rarity counts', ko: '테크 등급 수량' },
  'Base ATK': { en: 'Base ATK', ko: '기본 ATK' },
  'Final ATK': { en: 'Final ATK', ko: '최종 ATK' },
  'ATK %': { en: 'ATK %', ko: 'ATK %' },
  'Crit rate': { en: 'Crit rate', ko: '치명타 확률' },
  'Crit damage': { en: 'Crit damage', ko: '치명타 피해' },
  'Skill damage': { en: 'Skill damage', ko: '스킬 피해' },
  'Shield damage': { en: 'Shield damage', ko: '보호막 피해' },
  'Poisoned target': { en: 'Poisoned target', ko: '중독 대상' },
  'Weakened target': { en: 'Weakened target', ko: '약화 대상' },
  'Chilled target': { en: 'Chilled target', ko: '빙결 대상' },
  'Lacerated target': { en: 'Lacerated target', ko: '열상 대상' },
  'Guild Expedition testaments': { en: 'Guild Expedition testaments', ko: '길드원정 증표 수' },
  'Otherworld pet sync': { en: 'Otherworld pet sync', ko: '이세계 펫 동조' },
  'Pet ATK': { en: 'Pet ATK', ko: '펫 ATK' },
  'Movement speed': { en: 'Movement speed', ko: '이동 속도' },
  'Movement speed cap': { en: 'Movement speed cap', ko: '이동 속도 상한' },
  'Collection set progress': { en: 'Collection set progress', ko: '수집품 세트 진행도' },
  'Collection stars': { en: 'Collection stars', ko: '수집품 별' },
  'Custom collection sets': { en: 'Custom collection sets', ko: '커스텀 수집품 세트' },
  'Survivor level': { en: 'Survivor level', ko: '특공대 레벨' },
  'Survivor star': { en: 'Survivor star', ko: '특공대 별' },
  'Survivor awakening': { en: 'Survivor awakening', ko: '특공대 각성' },
  'Teamwork slots': { en: 'Teamwork slots', ko: '팀워크 슬롯' },
  'Passive crit': { en: 'Passive crit', ko: '패시브 치명' },
  'Pet awakening': { en: 'Pet awakening', ko: '펫 각성' },
  'Assist pets': { en: 'Assist pets', ko: '지원 펫' },
  'Pet xeno': { en: 'Pet xeno', ko: '펫 Xeno' },
  'Pet resonance chance': { en: 'Pet resonance chance', ko: '펫 공명 확률' },
  'Pet resonance ATK': { en: 'Pet resonance ATK', ko: '펫 공명 ATK' },
  'Mount puzzle slots': { en: 'Mount puzzle slots', ko: '탈것 퍼즐 슬롯' },
  'Mount stat inputs': { en: 'Mount stat inputs', ko: '탈것 스탯 입력' },
  'Mount ATK %': { en: 'Mount ATK %', ko: '탈것 ATK %' },
  'Mount skill %': { en: 'Mount skill %', ko: '탈것 스킬 %' },
  'Equipment otherworld cores': { en: 'Equipment otherworld cores', ko: '장비 이세계 코어' },
  'Lunar Mine turf nodes': { en: 'Lunar Mine turf nodes', ko: '루나 광산 터프 노드' },
};

export function normalizeTechOptimizerLocale(locale: string | undefined): TechOptimizerLocale {
  return locale === 'ko' ? 'ko' : 'en';
}

export function getTechOptimizerCopy(locale: string | undefined): TechOptimizerCopy {
  return COPIES[normalizeTechOptimizerLocale(locale)];
}

export function localizeTechResourceWalletFields(locale: string | undefined): WalletFieldCopy[] {
  return WALLET_FIELDS[normalizeTechOptimizerLocale(locale)];
}

export function localizeTechInventoryMessage(value: string, locale: string | undefined): string {
  const normalized = normalizeTechOptimizerLocale(locale);
  return INVENTORY_MESSAGES[value]?.[normalized] ?? value;
}

export function localizeProductImportSummary(value: string, locale: string | undefined): string {
  const normalized = normalizeTechOptimizerLocale(locale);
  if (normalized === 'en') return value;
  const exact = IMPORT_SUMMARY_PHRASES[value]?.[normalized];
  if (exact) return exact;
  return value
    .split(' / ')
    .map((part) => IMPORT_SUMMARY_PHRASES[part]?.[normalized] ?? part)
    .join(' / ');
}

export function localizeTechFieldLabel(value: string, locale: string | undefined): string {
  const normalized = normalizeTechOptimizerLocale(locale);
  return FIELD_LABELS[value]?.[normalized] ?? value;
}
