/*
 * 契合度計算與分組。全部是純函式，不碰 Durable Object 也不碰 WebSocket，
 * 才能用 `npm test` 單獨驗證——這是整個遊戲唯一「算錯了也不會報錯、只會結果很怪」的地方。
 *
 * 題目沒有正確答案（「火鍋要不要加芋頭」那種），所以這裡不存在分數、對錯、答對題數。
 * 唯一的量是「兩個人有多像」。
 */

// 每組目標人數。3 以下聊不起來，5 以上會有人插不上話
export const DEFAULT_GROUP_SIZE = 4;
export const MIN_GROUP_SIZE = 3;
export const MAX_GROUP_SIZE = 5;

// 少於這個人數就不分組，直接給兩兩契合度榜——6 個人分兩組、每組 3 人已經是下限
export const MIN_PLAYERS_TO_GROUP = 6;

// 共同作答題數少於這個數字的組合不列進榜：1 題就 100% 只是誤導
export const MIN_COMMON_ANSWERS = 2;

/*
 * 每個「答案」的權重＝該答案在全場的比例的倒數。
 *
 * 全場九成都選 O 的題目，兩個人都選 O 幾乎沒有資訊量（權重 ≈ 1.1）；
 * 十個人裡只有兩個選 X，這兩個人都選 X 才是強訊號（權重 = 5）。
 * 不加權的話隨機兩人本來就有 ~50% 契合度，所有人的數字會擠在 50–75%，看不出差別。
 */
export function answerWeights(answers) {
  const tally = new Map(); // questionId -> { O, X, total }

  for (const perQuestion of Object.values(answers)) {
    for (const [questionId, value] of Object.entries(perQuestion)) {
      if (value !== 'O' && value !== 'X') continue;
      const row = tally.get(questionId) ?? { O: 0, X: 0, total: 0 };
      row[value] += 1;
      row.total += 1;
      tally.set(questionId, row);
    }
  }

  const weights = new Map(); // questionId -> { O, X, total }
  for (const [questionId, row] of tally) {
    weights.set(questionId, {
      // count 為 0 表示沒有人選這一邊，權重不會被用到，給 total 當上限就好
      O: row.O ? row.total / row.O : row.total,
      X: row.X ? row.total / row.X : row.total,
      total: row.total,
    });
  }
  return weights;
}

/*
 * 把「隨機兩個人」的期望分數校正回 1.0。
 *
 * 直覺上 1/比例 這個權重的期望貢獻就是 1，但那是把「同一個人抽兩次」也算進去才成立的。
 * 實際比對的一定是兩個**不同**的人，扣掉自己配自己之後期望值是 (T-2)/(T-1)：
 * 8 個人時是 0.857，30 個人時是 0.967——人少的場次分數會被系統性壓低。
 * 乘上這個倒數之後，不管幾個人來玩，1.0 都代表「跟路人甲一樣像」。
 *
 * 只有 2 個人答的題目沒有「隨機」可言（那一對就是全部），不校正。
 */
function chanceCorrection(total) {
  return total > 2 ? (total - 1) / (total - 2) : 1;
}

/*
 * 兩個人的契合度。只看「雙方都有作答」的題目——沒在 10 秒內答完的題目直接跳過，
 * 不能當成「答案不同」，那會平白拉低沒趕上時間的人的契合度。
 *
 *   score = Σ(答案相同的題目權重) ÷ 共同作答題數
 *
 * 分母**不能**用「雙方那幾題的權重總和」：兩個人如果每題都一樣，分子分母會完全相消，
 * 不管答的是冷門還是熱門答案都得到 1.0，加權等於白做（這條是被測試抓出來的）。
 * 改成除以題數之後，這個分數有一個很好用的性質：
 *
 *   **隨機兩個人的期望分數剛好是 1.0。**
 *
 * 因為每題的期望貢獻 = P(答案剛好一樣) × E[權重 | 一樣]
 *                    = (n_O² + n_X²) / T² × T² / (n_O² + n_X²) = 1
 *
 * 所以 1.0 ＝「跟路人甲一樣像」，2.0 ＝「像到隨機的兩倍」。分數只拿來排名與分組，
 * 畫面上給玩家看的是 same / common 的白話數字（「10 題裡你們有 7 題一樣」）——
 * 加權分數不好懂也不好解釋，不要顯示。
 */
export function pairAffinity(a, b, weights) {
  let matched = 0;
  let same = 0;
  let common = 0;
  const sharedQuestions = [];

  for (const [questionId, valueA] of Object.entries(a)) {
    const valueB = b[questionId];
    if (valueB === undefined) continue;

    const weight = weights.get(questionId);
    if (!weight) continue;

    common += 1;
    if (valueA === valueB) {
      same += 1;
      sharedQuestions.push({ questionId, value: valueA });
      matched += weight[valueA] * chanceCorrection(weight.total);
    }
    // 答案不同：分子不加，但分母（共同作答題數）照算，自然把分數拉下來
  }

  return {
    score: common > 0 ? matched / common : 0,
    same,
    common,
    // 顯示用的百分比走白話版本，不是加權版
    percent: common > 0 ? Math.round((same / common) * 100) : 0,
    sharedQuestions,
  };
}

/*
 * 全部兩兩組合。playerIds 先排序，讓同樣的輸入永遠算出同樣的結果——
 * DO 休眠喚醒後可能重算，兩次算出不同的分組會很難看。
 */
export function affinityMatrix(playerIds, answers) {
  const ids = [...playerIds].sort();
  const weights = answerWeights(answers);
  const matrix = new Map(); // "a|b"（a < b）-> affinity

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i];
      const b = ids[j];
      matrix.set(`${a}|${b}`, pairAffinity(answers[a] ?? {}, answers[b] ?? {}, weights));
    }
  }
  return { ids, weights, matrix };
}

export function lookup(matrix, a, b) {
  return matrix.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? null;
}

/*
 * 分組：有人數上限的凝聚式分法。
 *
 *   1. 先算好每組要幾個人（總人數平均分，餘數往前面的組加）
 *   2. 取契合度最高、且兩人都還沒分組的一對當種子
 *   3. 反覆把「與組內現有成員平均契合度最高」的人加進來，直到這組滿員
 *   4. 開下一組重複
 *
 * 重點是**每個人都會在某一組裡**。原本一對一配對的話，「最佳拍檔」不是對稱的
 * （A 的拍檔是 B，不代表 B 的拍檔是 A），一定會有人不是任何人的拍檔——
 * 破冰活動裡讓人發現自己沒被任何人選到是最糟的結果。
 */
export function buildGroups(playerIds, answers, groupSize = DEFAULT_GROUP_SIZE) {
  const { ids, matrix } = affinityMatrix(playerIds, answers);
  if (!ids.length) return { groups: [], grouped: false, matrix };

  if (ids.length < MIN_PLAYERS_TO_GROUP) {
    // 人太少，分組沒意義：整場當一組，畫面改成顯示兩兩契合度榜
    return { groups: [{ members: ids }], grouped: false, matrix };
  }

  const size = clamp(groupSize, MIN_GROUP_SIZE, MAX_GROUP_SIZE);
  const targets = groupSizes(ids.length, size);

  const remaining = new Set(ids);
  const groups = [];

  for (const target of targets) {
    if (!remaining.size) break;
    const members = [];

    // 種子：剩下的人裡契合度最高的一對
    const seed = bestPair(remaining, matrix);
    if (seed) {
      members.push(seed[0], seed[1]);
      remaining.delete(seed[0]);
      remaining.delete(seed[1]);
    } else {
      const only = [...remaining].sort()[0];
      members.push(only);
      remaining.delete(only);
    }

    while (members.length < target && remaining.size) {
      const next = bestFit(members, remaining, matrix);
      members.push(next);
      remaining.delete(next);
    }

    groups.push({ members });
  }

  // 理論上不會有剩的人，但組數算法改動時容易出錯，補一層保險：塞進平均契合度最高的組
  for (const leftover of [...remaining].sort()) {
    let best = groups[0];
    let bestScore = -Infinity;
    for (const group of groups) {
      const score = averageScore(leftover, group.members, matrix);
      if (score > bestScore) {
        bestScore = score;
        best = group;
      }
    }
    best.members.push(leftover);
  }

  return { groups, grouped: true, matrix };
}

// 平均分，餘數往前面的組加：10 人分 3 組 = 4 / 3 / 3，不會變成 4 / 4 / 2
function groupSizes(total, size) {
  const count = Math.max(1, Math.ceil(total / size));
  const base = Math.floor(total / count);
  const extra = total % count;
  return Array.from({ length: count }, (unused, index) => base + (index < extra ? 1 : 0));
}

// 同分時比共同作答題數，再同分就比 id：同樣的輸入要能算出一模一樣的分組
function betterPair(candidate, incumbent) {
  if (!incumbent) return true;
  if (candidate.score !== incumbent.score) return candidate.score > incumbent.score;
  if (candidate.common !== incumbent.common) return candidate.common > incumbent.common;
  return candidate.key < incumbent.key;
}

function bestPair(remaining, matrix) {
  const ids = [...remaining].sort();
  let best = null;

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const affinity = lookup(matrix, ids[i], ids[j]);
      if (!affinity) continue;
      const candidate = {
        score: affinity.score,
        common: affinity.common,
        key: `${ids[i]}|${ids[j]}`,
        pair: [ids[i], ids[j]],
      };
      if (betterPair(candidate, best)) best = candidate;
    }
  }
  return best?.pair ?? null;
}

function bestFit(members, remaining, matrix) {
  let best = null;

  for (const id of [...remaining].sort()) {
    const candidate = {
      score: averageScore(id, members, matrix),
      common: averageCommon(id, members, matrix),
      key: id,
    };
    if (betterPair(candidate, best)) best = candidate;
  }
  return best.key;
}

function averageScore(id, members, matrix) {
  if (!members.length) return 0;
  let sum = 0;
  for (const member of members) sum += lookup(matrix, id, member)?.score ?? 0;
  return sum / members.length;
}

function averageCommon(id, members, matrix) {
  if (!members.length) return 0;
  let sum = 0;
  for (const member of members) sum += lookup(matrix, id, member)?.common ?? 0;
  return sum / members.length;
}

/*
 * 組內共同話題：全組答案一致的題目。
 *
 * 4 個人全部一致的題目可能一題都沒有，那樣結果頁會開天窗，所以不足 minTopics 題時
 * 補上「只有一個人不一樣」的題目並標記 dissenter——那種題目其實更好聊
 * （「就你一個人不加芋頭喔？」），不是退而求其次。
 */
export function groupTopics(members, answers, minTopics = 3) {
  const unanimous = [];
  const almost = [];
  const questionIds = new Set();
  for (const id of members) {
    for (const questionId of Object.keys(answers[id] ?? {})) questionIds.add(questionId);
  }

  for (const questionId of [...questionIds].sort()) {
    const votes = { O: [], X: [] };
    for (const id of members) {
      const value = answers[id]?.[questionId];
      if (value === 'O' || value === 'X') votes[value].push(id);
    }
    const answered = votes.O.length + votes.X.length;
    // 只有一個人作答的題目不算共同話題，聊不起來
    if (answered < 2) continue;

    if (votes.O.length === answered) unanimous.push({ questionId, value: 'O', dissenter: null });
    else if (votes.X.length === answered) unanimous.push({ questionId, value: 'X', dissenter: null });
    else if (votes.O.length === 1) almost.push({ questionId, value: 'X', dissenter: votes.O[0] });
    else if (votes.X.length === 1) almost.push({ questionId, value: 'O', dissenter: votes.X[0] });
  }

  const topics = [...unanimous];
  if (topics.length < minTopics) topics.push(...almost.slice(0, minTopics - topics.length));
  return topics;
}

/*
 * 兩兩契合度榜。人數不足以分組時給玩家看的東西，主持人畫面也用它當補充資訊。
 * 共同作答題數不到門檻的組合不列——1 題就 100% 只會讓人誤會。
 */
export function affinityRanking(playerIds, answers, limit = 10) {
  const { ids, matrix } = affinityMatrix(playerIds, answers);
  const rows = [];

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const affinity = lookup(matrix, ids[i], ids[j]);
      if (!affinity || affinity.common < MIN_COMMON_ANSWERS) continue;
      rows.push({
        players: [ids[i], ids[j]],
        score: affinity.score,
        same: affinity.same,
        common: affinity.common,
        percent: affinity.percent,
      });
    }
  }

  rows.sort(
    (a, b) => b.score - a.score || b.common - a.common || (a.players[0] < b.players[0] ? -1 : 1),
  );
  return rows.slice(0, limit);
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}
