import {byId, decisionIds} from './flow.js';

export const defaultFields = ['anxiety', ...decisionIds];
export const historyPageSize = 10;

export function validDefaults(input = {}) {
  const result = {};
  for (const key of defaultFields) {
    const field = key === 'anxiety' ? byId.handling.fields[0] : byId[key].fields[0];
    if (field.options.includes(input[key])) result[key] = input[key];
  }
  return result;
}

export function ageAt(birthday, now = new Date()) {
  if (!birthday) return '';
  const [year, month, day] = birthday.split('-').map(Number);
  const months = (now.getFullYear() - year) * 12 + now.getMonth() + 1 - month - (now.getDate() < day ? 1 : 0);
  if (months < 0 || !Number.isFinite(months)) return '';
  if (months < 12) return months ? months + (months === 1 ? ' month' : ' months') : 'Under 1 month';
  const years = Math.floor(months / 12);
  return years + (years === 1 ? ' year' : ' years');
}

export function beginVisit(dog, owner, previous) {
  const prior = previous ? structuredClone(previous.data) : {};
  const answers = {...validDefaults(dog.care_defaults), ...prior,
    name: dog.name, breed: dog.breed, birthday: dog.birthday || '', age: ageAt(dog.birthday) || prior.age || '',
    owner: owner.display_name, phone: owner.phone || '', email: owner.email || '',
    visit: '', includeContact: false, checked: false, understood: false};
  return {answers, resume: previous ? 'review-look' : 'dog', complete: null, editReturn: null,
    origin: null, dogId: dog.id, ownerId: owner.owner_id, recordId: crypto.randomUUID()};
}
