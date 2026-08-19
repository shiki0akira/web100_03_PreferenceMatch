/*
 * 分組演算法的測試。這一段是整個遊戲唯一「算錯了不會報錯、只會結果很怪」的地方，
 * 而且要真的把 10 個人湊在同一個房間才看得出來，所以用單元測試守住。
 *
 * 跑法：npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  answerWeights,
  pairAffinity,
  buildGroups,
  groupTopics,
  affinityRanking,
} from '../src/grouping.js';

// 依序把答案字串（例如 'OOXX'）攤成 { q1: 'O', q2: 'O', q3: 'X', q4: 'X' }。
// '-' 代表這題沒在時限內作答。
function answersFrom(rows) {
  const out = {};
  for (const [id, pattern] of Object.entries(rows)) {
    const perQuestion = {};
    [...pattern].forEach((value, index) => {
      if (value !== '-') perQuestion[`q${index + 1}`] = value;
    });
    out[id] = perQuestion;
  }
  return out;
}

test('權重＝該答案全場比例的倒數', () => {
  // q1：4 個人選 O、1 個人選 X
  const answers = answersFrom({ a: 'O', b: 'O', c: 'O', d: 'O', e: 'X' });
  const weights = answerWeights(answers);

  assert.equal(weights.get('q1').O, 5 / 4);
  assert.equal(weights.get('q1').X, 5 / 1);
});

test('少數派意見一致，分數高於多數派意見一致', () => {
  // q1 是壓倒性的 O（8:2），q2 也是壓倒性的 O（8:2）
  const answers = answersFrom({
    minority1: 'XX',
    minority2: 'XX',
    m1: 'OO',
    m2: 'OO',
    m3: 'OO',
    m4: 'OO',
    m5: 'OO',
    m6: 'OO',
    m7: 'OO',
    m8: 'OO',
  });
  const weights = answerWeights(answers);

  const rare = pairAffinity(answers.minority1, answers.minority2, weights);
  const common = pairAffinity(answers.m1, answers.m2, weights);

  // 白話百分比兩組都是 100%，看不出差別
  assert.equal(rare.percent, 100);
  assert.equal(common.percent, 100);
  // 但加權分數要能分出「都選冷門那邊」才是真的像
  assert.ok(rare.score > common.score, `${rare.score} 應該大於 ${common.score}`);
});

test('隨機兩個人的期望分數是 1.0（分數的基準線）', () => {
  // 把全場所有兩兩組合的分數平均起來，應該回到 1.0。
  // 這是加權公式的核心性質：1.0 ＝「跟路人甲一樣像」，看到 2.0 才是真的合拍。
  const answers = answersFrom({
    a: 'OOXOX',
    b: 'OXXOO',
    c: 'XXOXO',
    d: 'XOOXX',
    e: 'OXOXO',
    f: 'XOXOX',
    g: 'OOOOO',
    h: 'XXXXX',
  });
  const ranking = affinityRanking(Object.keys(answers), answers, 999);
  const mean = ranking.reduce((sum, row) => sum + row.score, 0) / ranking.length;

  assert.ok(Math.abs(mean - 1) < 1e-9, `平均分數應該是 1.0，實際是 ${mean}`);
});

test('沒作答的題目跳過，不算成答案不同', () => {
  const answers = answersFrom({ a: 'OOX', b: 'OO-' });
  const weights = answerWeights(answers);
  const affinity = pairAffinity(answers.a, answers.b, weights);

  // q3 只有 a 答了，不列入共同題數
  assert.equal(affinity.common, 2);
  assert.equal(affinity.same, 2);
  assert.equal(affinity.percent, 100);
});

test('10 人分成 4 / 3 / 3，每個人剛好在一組裡', () => {
  const answers = answersFrom({
    p01: 'OOOOOOOO',
    p02: 'OOOOOOOX',
    p03: 'OOOOOOXX',
    p04: 'XXXXOOOO',
    p05: 'XXXXOOOX',
    p06: 'XXXXOOXX',
    p07: 'XXXXXXXX',
    p08: 'XXXXXXXO',
    p09: 'XXXXXXOO',
    p10: 'OXOXOXOX',
  });
  const { groups, grouped } = buildGroups(Object.keys(answers), answers, 4);

  assert.equal(grouped, true);
  assert.deepEqual(
    groups.map((group) => group.members.length),
    [4, 3, 3],
  );

  const seen = groups.flatMap((group) => group.members);
  assert.equal(seen.length, 10, '每個人只能出現一次');
  assert.equal(new Set(seen).size, 10, '不能有人重複或漏掉');
});

test('同樣的輸入一定算出同樣的分組', () => {
  const answers = answersFrom({
    p1: 'OOXOX',
    p2: 'OOXOO',
    p3: 'XXOXO',
    p4: 'XXOXX',
    p5: 'OXOXO',
    p6: 'XOXOX',
    p7: 'OOOOO',
    p8: 'XXXXX',
  });
  const first = buildGroups(Object.keys(answers), answers, 4);
  // 打亂 id 順序也要得到一樣的結果：DO 休眠喚醒後重算不能跑出不同的分組
  const second = buildGroups(Object.keys(answers).reverse(), answers, 4);

  assert.deepEqual(
    first.groups.map((group) => group.members),
    second.groups.map((group) => group.members),
  );
});

test('不到 6 個人就不分組', () => {
  const answers = answersFrom({ a: 'OOX', b: 'OOX', c: 'XXO', d: 'XXO', e: 'OXO' });
  const { groups, grouped } = buildGroups(Object.keys(answers), answers, 4);

  assert.equal(grouped, false);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].members.length, 5);
});

test('全組一致的題目不足時，補上只有一人不同的題目', () => {
  // q1 全組一致；q2 只有 d 不同；q3 只有 a 不同；q4 兩兩分裂
  const answers = answersFrom({ a: 'OOXO', b: 'OOOX', c: 'OOOO', d: 'OXOX' });
  const topics = groupTopics(['a', 'b', 'c', 'd'], answers, 3);

  assert.equal(topics.length, 3);
  assert.deepEqual(topics[0], { questionId: 'q1', value: 'O', dissenter: null });

  const withDissenter = topics.filter((topic) => topic.dissenter);
  assert.equal(withDissenter.length, 2);
  assert.deepEqual(
    withDissenter.map((topic) => topic.questionId).sort(),
    ['q2', 'q3'],
  );
});

test('共同作答不到 2 題的組合不列進契合度榜', () => {
  const answers = answersFrom({ a: 'O--', b: 'O--', c: 'OOX', d: 'OOX' });
  const ranking = affinityRanking(Object.keys(answers), answers);

  // a、b 只有 q1 一題共同，不該出現
  const pairs = ranking.map((row) => row.players.join('|'));
  assert.ok(!pairs.includes('a|b'), 'a|b 只有 1 題共同，不該上榜');
  assert.ok(pairs.includes('c|d'), 'c|d 有 3 題共同，應該上榜');
});

test('每個人都答一樣時不會爆掉，分數也不會是 NaN', () => {
  const answers = answersFrom({ a: 'OOO', b: 'OOO', c: 'OOO', d: 'OOO', e: 'OOO', f: 'OOO' });
  const { groups } = buildGroups(Object.keys(answers), answers, 3);

  assert.equal(groups.flatMap((group) => group.members).length, 6);
  const ranking = affinityRanking(Object.keys(answers), answers);
  for (const row of ranking) assert.ok(Number.isFinite(row.score), 'score 不能是 NaN');
});

test('完全沒有人作答時回傳空結果，不丟例外', () => {
  const { groups, grouped } = buildGroups([], {}, 4);
  assert.equal(grouped, false);
  assert.deepEqual(groups, []);
});
