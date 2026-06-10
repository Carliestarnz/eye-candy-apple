const STORAGE_KEY = "beautyAlchemy.savedPrompts";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeAll = (prompts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
};

export const getSavedPrompts = () => readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getSavedPromptById = (id) => readAll().find((prompt) => prompt.id === id);

export const savePrompt = (prompt) => {
  const now = new Date().toISOString();
  const saved = {
    ...prompt,
    id: prompt.id || crypto.randomUUID(),
    createdAt: prompt.createdAt || now,
    updatedAt: now,
  };
  const prompts = readAll();
  const index = prompts.findIndex((item) => item.id === saved.id);
  if (index >= 0) prompts[index] = saved;
  else prompts.push(saved);
  writeAll(prompts);
  return saved;
};

export const duplicateSavedPrompt = (id) => {
  const source = getSavedPromptById(id);
  if (!source) return null;
  return savePrompt({
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title || "Untitled"} copy`,
    createdAt: undefined,
    updatedAt: undefined,
  });
};

export const deleteSavedPrompt = (id) => {
  writeAll(readAll().filter((prompt) => prompt.id !== id));
};

export const exportSavedPrompts = () => JSON.stringify(getSavedPrompts(), null, 2);
