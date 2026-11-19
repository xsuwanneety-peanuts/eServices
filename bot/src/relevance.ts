import type { KnowledgeArticle } from '../../src/types';
import { articleText } from '../../src/utils/assistantPrompt';

// Teams waits at most 5 seconds for an answer, so the bot cannot send the whole Knowledge Base
// to Gemini with every question. It picks the few articles closest to the question first.
// Thai has no spaces between words, so Thai is compared in two-letter pieces (bigrams);
// English and numbers are compared as whole words, since English bigrams ("se", "er", ...)
// appear in almost every article.

const THAI = /[฀-๿]+/g;
const WORD = /[a-z0-9]{2,}/g;

const thaiBigrams = (text: string): Set<string> => {
  const set = new Set<string>();
  for (const run of text.match(THAI) ?? []) {
    for (let i = 0; i < run.length - 1; i++) set.add(run.slice(i, i + 2));
  }
  return set;
};
const words = (text: string) => new Set(text.toLowerCase().match(WORD) ?? []);

interface Pieces {
  thai: Set<string>;
  words: Set<string>;
}
const pieces = (text: string): Pieces => ({ thai: thaiBigrams(text), words: words(text) });

/** How much of the question appears in the article; title, summary and tags count double. */
const score = (question: Pieces, article: KnowledgeArticle): number => {
  const head = pieces(`${article.title} ${article.summary} ${article.tags.join(' ')}`);
  const body = pieces(articleText(article));
  let total = 0;
  question.thai.forEach(p => (total += head.thai.has(p) ? 2 : body.thai.has(p) ? 1 : 0));
  // A whole English word says more than a pair of Thai letters
  question.words.forEach(w => (total += head.words.has(w) ? 6 : body.words.has(w) ? 3 : 0));
  return total;
};

/** The articles most related to the question, best first (at most `limit`). */
export const relevantArticles = (question: string, articles: KnowledgeArticle[], limit = 3) => {
  const asked = pieces(question);
  return articles
    .map(article => ({ article, score: score(asked, article) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(row => row.article);
};
