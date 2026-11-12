// What the game is made of: the things you gather, what you can build with them, the spirits and the animals.
// Only words and numbers here; how each looks is in models.js.

/** Where your land is: a round plot on the hill the walk starts from. Buildings go inside it. */
export const HOME = { x: -6, z: 10, r: 58 };

export const ITEMS = {
  wood: { name: '나무', icon: '🪵', color: [0.55, 0.36, 0.2] },
  stone: { name: '돌', icon: '🪨', color: [0.55, 0.55, 0.52] },
  fiber: { name: '풀섬유', icon: '🌾', color: [0.78, 0.72, 0.35] },
  berry: { name: '열매', icon: '🫐', color: [0.35, 0.25, 0.7] },
  flower: { name: '꽃', icon: '🌼', color: [0.98, 0.8, 0.3] },
  mushroom: { name: '버섯', icon: '🍄', color: [0.85, 0.3, 0.22] },
  clay: { name: '점토', icon: '🧱', color: [0.72, 0.45, 0.32] },
  glow: { name: '빛구슬', icon: '✨', color: [1.0, 0.92, 0.55] },
};
export const ITEM_ORDER = ['wood', 'stone', 'fiber', 'berry', 'flower', 'mushroom', 'clay', 'glow'];

/**
 * What can be built. cost: what it takes; work: seconds of building for one pair of hands; r: how much room it
 * wants round its middle, metres; solid: what you can't walk through ([half x, half height, half z] or a radius);
 * camp: what it adds to the campsite's stars.
 */
export const BUILDINGS = {
  campfire: { name: '모닥불', desc: '해 질 녘이면 더 따뜻해요. 불씨정령이 찾아올지도 몰라요.', cost: { wood: 3, stone: 3 }, work: 8, r: 0.9, solid: 0.55, camp: 2 },
  tent: { name: '텐트', desc: '들어가 쉬면 다음 날 아침이 됩니다.', cost: { wood: 4, fiber: 6 }, work: 14, r: 2.0, solid: [1.2, 0.9, 1.5], camp: 3 },
  bench: { name: '통나무 의자', desc: '모닥불 곁에 두기 좋아요.', cost: { wood: 2 }, work: 5, r: 0.9, solid: [0.8, 0.3, 0.25], camp: 1 },
  table: { name: '나무 식탁', desc: '캠핑장 한가운데에 어울리는 식탁.', cost: { wood: 5 }, work: 9, r: 1.4, solid: [0.95, 0.4, 0.8], camp: 2 },
  lantern: { name: '등불 기둥', desc: '저녁이 되면 불이 켜집니다.', cost: { wood: 2, clay: 1 }, work: 6, r: 0.5, solid: 0.14, camp: 1 },
  fence: { name: '울타리', desc: '내 땅을 꾸며 보세요.', cost: { wood: 1 }, work: 3, r: 0.6, solid: [1.0, 0.5, 0.1], camp: 0 },
  path: { name: '디딤돌', desc: '풀밭 위에 놓는 납작한 돌길.', cost: { stone: 1 }, work: 2, r: 0.5, solid: null, camp: 0 },
  hut: { name: '정령집', desc: '정령 둘이 더 머물 수 있어요.', cost: { wood: 6, stone: 2, fiber: 4 }, work: 16, r: 1.6, solid: 1.0, camp: 2 },
  flowerbed: { name: '꽃밭', desc: '날마다 꽃이 핍니다.', cost: { wood: 1, flower: 4 }, work: 7, r: 1.4, solid: null, camp: 1 },
  garden: { name: '열매밭', desc: '날마다 열매가 열립니다.', cost: { wood: 2, berry: 3 }, work: 9, r: 1.6, solid: null, camp: 1 },
  feeder: { name: '먹이터', desc: '열매를 놓아두면 친해진 동물들이 놀러 와요.', cost: { wood: 3, berry: 2 }, work: 7, r: 0.7, solid: 0.14, camp: 1 },
  well: { name: '우물', desc: '맑은 물이 솟아요. 물정령이 좋아합니다.', cost: { stone: 8, wood: 3, clay: 2 }, work: 20, r: 1.4, solid: 0.9, camp: 2 },
  cabin: { name: '오두막', desc: '통나무로 지은 아늑한 집.', cost: { wood: 20, stone: 10, clay: 6, fiber: 6 }, work: 45, r: 3.6, solid: [2.35, 1.4, 1.95], camp: 6 },
  cairn: { name: '빛의 돌탑', desc: '정령들의 빛을 모아 세우는 탑. 골짜기의 모든 정령이 기뻐합니다.', cost: { stone: 12, flower: 6, glow: 5 }, work: 30, r: 1.4, solid: 0.8, camp: 5 },
};
export const BUILD_ORDER = ['campfire', 'tent', 'bench', 'table', 'lantern', 'fence', 'path', 'hut', 'flowerbed', 'garden', 'feeder', 'well', 'cabin', 'cairn'];

/** What a spirit can be asked to do. gives: what a trip brings back; time: seconds of work at the spot. */
export const JOBS = {
  rest: { name: '쉬기', icon: '💤' },
  wood: { name: '나무하기', icon: '🪵', gives: ['wood'], time: 8 },
  stone: { name: '돌 캐기', icon: '🪨', gives: ['stone'], time: 10 },
  fiber: { name: '풀 베기', icon: '🌾', gives: ['fiber'], time: 6 },
  forage: { name: '먹거리 찾기', icon: '🫐', gives: ['berry', 'berry', 'mushroom', 'flower'], time: 7 },
  clay: { name: '점토 캐기', icon: '🧱', gives: ['clay'], time: 11 },
  build: { name: '건설 돕기', icon: '🔨' },
};
export const JOB_ORDER = ['rest', 'wood', 'stone', 'fiber', 'forage', 'clay', 'build'];

/**
 * The kinds of spirit. gift: what one asks for before it will come with you; best: the job it does twice as well;
 * where: the kind of place it is met in (see spirits.js).
 */
export const SPIRITS = {
  wood: { name: '숲정령', body: [0.42, 0.72, 0.3], accent: [0.2, 0.45, 0.16], gift: ['berry', 2], best: 'wood', where: 'grove', says: '숲 그늘이 제일 좋아. 나무하는 건 나한테 맡겨!' },
  stone: { name: '돌정령', body: [0.66, 0.67, 0.7], accent: [0.42, 0.44, 0.5], gift: ['mushroom', 2], best: 'stone', where: 'stones', says: '단단한 게 좋아. 돌은 내가 잘 캐.' },
  water: { name: '물정령', body: [0.45, 0.78, 0.95], accent: [0.2, 0.5, 0.85], gift: ['flower', 3], best: 'clay', where: 'tarn', says: '물가의 흙은 말랑말랑해. 점토라면 내가 찾아 줄게.' },
  flower: { name: '꽃정령', body: [1.0, 0.62, 0.72], accent: [0.98, 0.85, 0.3], gift: ['fiber', 3], best: 'forage', where: 'flowers', says: '달콤한 열매랑 꽃이 어디 있는지 다 알아!' },
  wind: { name: '바람정령', body: [0.86, 0.95, 0.98], accent: [0.55, 0.8, 0.9], gift: ['flower', 2], best: 'fiber', where: 'hill', says: '풀밭을 스치는 건 내 특기야. 풀은 내가 벨게.' },
  ember: { name: '불씨정령', body: [1.0, 0.55, 0.2], accent: [1.0, 0.85, 0.3], gift: ['wood', 5], best: 'build', where: 'campfire', says: '따뜻한 모닥불이네! 뭐든 뚝딱뚝딱 지어 줄게.' },
};
export const SPIRIT_ORDER = ['wood', 'stone', 'flower', 'wind', 'water', 'ember'];
export const SPIRIT_NAMES = ['도토', '몽돌', '이슬', '꽃비', '산들', '모닥', '새싹', '여울', '보늬', '다래', '솔이', '초롱', '반디', '구름', '마루', '나래', '달이', '별이', '누리', '가람'];

/** The animals. likes: what it takes from your hand; where: [u, v] down the valley; roam: metres it wanders. */
export const ANIMALS = {
  squirrel: { name: '다람쥐', likes: 'berry', where: [12, -24], roam: 9, size: 0.5, speed: 3.6, says: '볼이 빵빵해질 때까지 열매를 모아요.' },
  rabbit: { name: '토끼', likes: 'flower', where: [70, 30], roam: 22, size: 0.7, speed: 4.6, says: '꽃을 오물오물 먹는 걸 좋아해요.' },
  deer: { name: '사슴', likes: 'berry', where: [150, -150], roam: 34, size: 1.5, speed: 5.4, says: '숲 가장자리에서 조용히 풀을 뜯어요.' },
  fox: { name: '여우', likes: 'mushroom', where: [250, 140], roam: 30, size: 0.95, speed: 5.0, says: '낯을 가리지만 버섯 냄새에는 못 참아요.' },
  duck: { name: '오리', likes: 'fiber', where: [372, 52], roam: 12, size: 0.6, speed: 2.6, says: '물가에서 뒤뚱뒤뚱. 부드러운 풀을 좋아해요.' },
};
export const ANIMAL_ORDER = ['squirrel', 'rabbit', 'deer', 'fox', 'duck'];

/** Things to do, in the order they are suggested. Each is checked against the game by goals in game.js. */
export const GOALS = [
  { id: 'gather', text: '나뭇가지와 돌을 주워 보세요 (나무 3, 돌 3)' },
  { id: 'campfire', text: 'B를 눌러 내 땅에 모닥불 짓기' },
  { id: 'spirit', text: '정령을 만나 선물을 주고 친구 되기' },
  { id: 'job', text: 'Tab을 눌러 정령에게 일 맡기기' },
  { id: 'tent', text: '텐트를 짓고 하룻밤 쉬기' },
  { id: 'animal', text: '동물에게 살금살금 다가가 먹이 주기' },
  { id: 'camp', text: '캠핑장 완성하기 (모닥불·텐트·의자·식탁·등불)' },
  { id: 'spirits3', text: '정령 친구 셋 모으기' },
  { id: 'cabin', text: '오두막 짓기' },
  { id: 'cairn', text: '빛의 돌탑 세우기' },
];

/** How a day runs: it begins at noon and the light goes at sunset; a day is this many seconds long. */
export const DAY = { from: 12.5, to: 20.4, seconds: 13 * 60 };
