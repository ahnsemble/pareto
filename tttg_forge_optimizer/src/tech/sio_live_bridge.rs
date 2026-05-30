#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum SioGeneratedLiveBridgeCase {
    XenoForcefieldBoomerang,
    SurvivorsHarmony,
    Lme2Testament,
    Lme2Judgment,
    CustomThresholdEdges,
    UpgradedCollectibleMultiplierBehavior,
    TechSetFolding,
    ItemSetFolding,
    IndividualStarTable,
}

impl SioGeneratedLiveBridgeCase {
    pub(crate) fn live_multiplier(self) -> f64 {
        match self {
            Self::XenoForcefieldBoomerang => 18_050_695_850_277_784.0,
            Self::SurvivorsHarmony => 37_309_568_530_289_480.0,
            Self::Lme2Testament => 256_417_354_305.522_67,
            Self::Lme2Judgment => 8_937_551_672_380.955,
            Self::CustomThresholdEdges => 6_705_805_543_796_681.0,
            Self::UpgradedCollectibleMultiplierBehavior => 4_428_307_078_971_286.0,
            Self::TechSetFolding => 3_905_404_737_608_512.0,
            Self::ItemSetFolding => 415_287_854_634_167_230.0,
            Self::IndividualStarTable => 3_034_810_009_525_474.0,
        }
    }
}
