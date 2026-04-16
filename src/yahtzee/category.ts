export type UpperCategory = 
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  ;

export const upperCategories: Readonly<Array<UpperCategory>> =
  Object.freeze([
    "ones",
    "twos",
    "threes",
    "fours",
    "fives",
    "sixes",
  ]);

export type LowerCategory = 
 | "threeOfAKind" 
 | "fourOfAKind" 
 | "fullHouse" 
 | "smallStraight" 
 | "largeStraight" 
 | "yahtzee" 
 | "chance"
 ;

export const lowerCategories: Readonly<Array<LowerCategory>> =
  Object.freeze([
    "threeOfAKind",
    "fourOfAKind",
    "fullHouse",
    "smallStraight",
    "largeStraight",
    "yahtzee",
    "chance",
  ]);

export type Category = UpperCategory | LowerCategory;

export const categories: Readonly<Array<Category>> =
  Object.freeze([
    ...upperCategories,
    ...lowerCategories,
  ]);

export const nameByCategory: Readonly<Record<Category, string>> = Object.freeze({
  ones: "ones",
  twos: "twos",
  threes: "threes",
  fours: "fours",
  fives: "fives",
  sixes: "sixes",
  threeOfAKind: "3-of-a-kind",
  fourOfAKind: "4-of-a-kind",
  fullHouse: "full house",
  smallStraight: "sm straight",
  largeStraight: "lg straight",
  yahtzee: "yahtzee",
  chance: "chance",
});

export const iconByCategory: Readonly<Record<Category, string>> = Object.freeze({
  ones: "⚀",
  twos: "⚁",
  threes: "⚂",
  fours: "⚃",
  fives: "⚄",
  sixes: "⚅",
  threeOfAKind: "③",
  fourOfAKind: "④",
  fullHouse: "⌂",
  smallStraight: "⇀",
  largeStraight: "⇉",
  yahtzee: "★",
  chance: "❂",
});
