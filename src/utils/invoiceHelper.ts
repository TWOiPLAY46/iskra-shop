/**
 * Ukrainian Number to Words converter and Invoice Generator Helper
 * for official Ukrainian Invoices (Рахунок-фактура) and Delivery Notes (Видаткова накладна).
 */

const ONES_MALE = ['', 'один', 'два', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
const ONES_FEMALE = ['', 'одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'];
const TEENS = [
  'десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять',
  'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'
];
const TENS = ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'];
const HUNDREDS = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот'];

function getPluralWord(n: number, one: string, twoToFour: string, fiveAndMore: string): string {
  const absN = Math.abs(n) % 100;
  const rem10 = absN % 10;
  if (absN > 10 && absN < 20) return fiveAndMore;
  if (rem10 > 1 && rem10 < 5) return twoToFour;
  if (rem10 === 1) return one;
  return fiveAndMore;
}

function triadToWords(num: number, isFemale = false): string {
  const h = Math.floor(num / 100);
  const t = Math.floor((num % 100) / 10);
  const o = num % 10;

  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h]);

  if (t === 1) {
    parts.push(TEENS[o]);
  } else {
    if (t > 1) parts.push(TENS[t]);
    if (o > 0) {
      parts.push(isFemale ? ONES_FEMALE[o] : ONES_MALE[o]);
    }
  }

  return parts.join(' ');
}

export function numberToUkrainianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Нуль гривень 00 копійок';

  const intPart = Math.floor(Math.abs(amount));
  const kopPart = Math.round((Math.abs(amount) - intPart) * 100);
  const kopStr = kopPart < 10 ? `0${kopPart}` : `${kopPart}`;

  if (intPart === 0) {
    return `Нуль гривень ${kopStr} копійок`;
  }

  const millions = Math.floor((intPart % 1000000000) / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const units = intPart % 1000;

  const parts: string[] = [];

  if (millions > 0) {
    const word = triadToWords(millions, false);
    const suffix = getPluralWord(millions, 'мільйон', 'мільйони', 'мільйонів');
    parts.push(`${word} ${suffix}`);
  }

  if (thousands > 0) {
    const word = triadToWords(thousands, true);
    const suffix = getPluralWord(thousands, 'тисяча', 'тисячі', 'тисяч');
    parts.push(`${word} ${suffix}`);
  }

  if (units > 0) {
    const word = triadToWords(units, true);
    parts.push(word);
  }

  const hryvniaWord = getPluralWord(intPart, 'гривня', 'гривні', 'гривень');
  const kopekWord = getPluralWord(kopPart, 'копійка', 'копійки', 'копійок');

  const text = parts.join(' ').trim();
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

  return `${capitalized} ${hryvniaWord} ${kopStr} ${kopekWord}`;
}
