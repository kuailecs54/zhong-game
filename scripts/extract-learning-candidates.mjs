#!/usr/bin/env node
/**
 * 学习字段候选句提取脚本（零依赖，ESM）
 *
 * 用途：从教材 md 中为 49 个项目管理过程粗提 definition（定义句）与
 * role（作用句）候选，供后续人工校对。运行产物只写 /tmp/opencode/。
 *
 * 提取规则：
 *  - 定义句：句子形如「X是……的过程」且包含完整过程名；
 *  - 作用句：句子含「主要作用是/包括」。若句子本身含过程名则直接归属；
 *    若为「本过程的主要作用……」则归属到当前小节标题对应的过程。
 * 句子按中文边界切分（。！？；及换行）。匹配前先把连续空白规整化，
 * 并尝试名称变体（制定↔制订、去空格）以规避排版差异。
 *
 * 用法：node scripts/extract-learning-candidates.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BOOK_PATH = `${ROOT}/book/系统集成项目管理工程师教程_第3版_完整版.md`;
const PROCESSES_PATH = `${ROOT}/public/data/processes.json`;
const OUT_PATH = '/tmp/opencode/learning-candidates.json';

// 每类候选最多保留条数、单条最大字符数
const MAX_PER_TYPE = 5;
const MAX_LEN = 200;

// 读取过程清单
const processes = JSON.parse(readFileSync(PROCESSES_PATH, 'utf8'));

// 教材中使用的名称别名（过程名 → 教材写法）
const NAME_ALIASES = {
  创建WBS: ['创建工作分解结构'],
};

/** 生成某过程名的匹配变体集合：原样、去空格、制定↔制订互换、去末尾「措施」、教材别名 */
function nameVariants(name) {
  const variants = new Set([name, name.replace(/\s+/g, '')]);
  variants.add(name.replace(/制定/g, '制订'));
  variants.add(name.replace(/\s+/g, '').replace(/制定/g, '制订'));
  // 教材中「实施风险应对措施」多写作「实施风险应对」
  variants.add(name.replace(/措施$/, ''));
  for (const alias of NAME_ALIASES[name] ?? []) {
    variants.add(alias);
    variants.add(alias.replace(/\s+/g, ''));
  }
  return [...variants];
}

// 预计算每个过程的变体（统一去空白后比较）
const procVariants = processes.map((p) => ({
  id: p.id,
  name: p.name,
  keys: nameVariants(p.name).map((v) => v.replace(/\s+/g, '')),
}));

/** 判断（去空白后的）句子是否包含某过程的任一名称变体 */
function matchProcess(sentenceCompact, proc) {
  return proc.keys.some((k) => sentenceCompact.includes(k));
}

/** 判断句子是否为定义句：形如「X是……的过程」（在去空白文本上匹配） */
function isDefinitionSentence(s) {
  return /是[^。！？；]*的过程[。！？；]?$/.test(s.replace(/\s+/g, ''));
}

/** 判断句子是否为作用句：含「主要作用是/包括」（在去空白文本上匹配） */
function isRoleSentence(s) {
  return /主要作用(是|包括)/.test(s.replace(/\s+/g, ''));
}

/** 过滤明显的习题噪声：含「参考答案」或以选项编号开头的句子 */
function isQuizNoise(s) {
  return /参考答案/.test(s) || /^[A-Da-d][.、．]/.test(s.trim());
}

const result = {};
for (const p of processes) {
  result[p.id] = { name: p.name, definitions: [], roles: [] };
}

function pushCandidate(entry, type, sentence) {
  const list = entry[type];
  // 去重：完全相同的句子只留一条
  if (list.length < MAX_PER_TYPE && !list.includes(sentence)) {
    list.push(sentence.slice(0, MAX_LEN));
  }
}

// 按标题分段：标题行切换当前小节所属过程；小节内累积多行后统一切句，
// 避免句子/过程名被排版换行拆断。
const lines = readFileSync(BOOK_PATH, 'utf8').split(/\r?\n/);
let currentProc = null; // 当前小节对应的过程（由标题推断）
let buffer = []; // 当前小节内累积的非标题行
let pending = ''; // 被标题打断的无标点残句，拼到下一小节开头
let lastDefProc = null; // 最近一条定义句命中的过程：「本过程的主要作用」通常紧跟其定义句

/** 把累积的行规整化后按中文句子边界切分并处理 */
function flushBuffer() {
  if (buffer.length === 0) return;
  const normalized = (pending + ' ' + buffer.join(' ')).replace(/\s+/g, ' ').trim();
  pending = '';
  buffer = [];
  const parts = normalized.split(/(?<=[。！？；])/).map((s) => s.trim()).filter(Boolean);
  // 末尾无终止标点的残句（多半被标题截断）留给下一小节拼接
  if (parts.length > 0 && !/[。！？；]$/.test(parts[parts.length - 1])) {
    pending = parts.pop();
  }
  const sentences = parts;

  for (const s of sentences) {
    if (isQuizNoise(s)) continue;
    const sCompact = s.replace(/\s+/g, '');
    // 直接命中：句子包含完整过程名
    const hitProcs = procVariants.filter((proc) => matchProcess(sCompact, proc));
    for (const proc of hitProcs) {
      const entry = result[proc.id];
      if (isDefinitionSentence(s)) {
        pushCandidate(entry, 'definitions', s);
        // 定义句是「本过程的主要作用」的归属锚点（取唯一命中时才更新）
        if (hitProcs.length === 1) lastDefProc = proc;
      } else if (isRoleSentence(s)) {
        pushCandidate(entry, 'roles', s);
      }
    }
    // 兜底：「本过程的主要作用」不含过程名时，优先归属最近定义句的过程，
    // 其次才是当前小节标题对应的过程
    if (hitProcs.length === 0 && isRoleSentence(s) && /本过程/.test(s)) {
      const owner = lastDefProc ?? currentProc;
      if (owner) pushCandidate(result[owner.id], 'roles', s);
    }
  }
}

// 主扫描：标题行先冲刷上一小节的缓冲，再切换当前过程；普通行进缓冲
for (const line of lines) {
  // 标题行：如「## 10.1制定项目章程」「### 15.2.3 实施风险应对措施」
  const heading = line.match(/^#{1,6}\s*\d+(?:[.\-]\d+)*\s*(.+)$/);
  if (heading) {
    flushBuffer();
    const titleCompact = heading[1].replace(/\s+/g, '');
    // 仅当标题能对应到某个过程时才切换归属；子标题（如「主要输入」）保持原归属
    const matched = procVariants.find((proc) => matchProcess(titleCompact, proc));
    if (matched) {
      currentProc = matched;
      lastDefProc = null; // 换节后重置定义句锚点
    }
    continue;
  }
  if (!line.trim()) continue;
  buffer.push(line);
}
flushBuffer();

// 写出产物
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');

// 覆盖率统计
const withDef = processes.filter((p) => result[p.id].definitions.length > 0);
const withRole = processes.filter((p) => result[p.id].roles.length > 0);
const missingBoth = processes.filter(
  (p) => result[p.id].definitions.length === 0 && result[p.id].roles.length === 0,
);

console.log(`共处理 ${processes.length} 个过程`);
console.log(`有 definition 候选：${withDef.length}/${processes.length}`);
console.log(`有 role 候选：${withRole.length}/${processes.length}`);
if (missingBoth.length > 0) {
  console.log('两者皆缺的过程：');
  for (const p of missingBoth) {
    console.log(`  - ${p.id} ${p.name}`);
  }
} else {
  console.log('两者皆缺的过程：无');
}
console.log(`产物已写入 ${OUT_PATH}`);
