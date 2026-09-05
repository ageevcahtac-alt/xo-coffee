export type LotCategory =
  | "microlot"
  | "espresso"
  | "filter"
  | "specialty-set";

export type BrewSpec = {
  ratio: string;
  tempC: number;
  timeLabel: string;
};

export type FlavorProfile = {
  acidity: number;
  sweetness: number;
  body: number;
  aroma: number;
  finish: number;
};

export type Lot = {
  id: string;
  name: string;
  category: LotCategory;
  tags: string[];
  country: string;
  region: string;
  farm: string;
  altitudeMasl: number;
  variety: string;
  process: string;
  sensory: string[];
  qScore: number;
  cupNote: string;
  farmStory: string;
  flavorProfile: FlavorProfile;
  price: number;
  brew: {
    v60: BrewSpec;
    immersion: BrewSpec;
    espresso: BrewSpec;
  };
};
