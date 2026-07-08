export function getModelById(settings, id) {
  return settings.models.find((m) => m.id === id) || null;
}

export function getActiveModel(settings, chats, chatId) {
  const chat = chats.find((c) => c.id === chatId);
  if (chat?.model) {
    return getModelById(settings, chat.model);
  }
  return getModelById(settings, settings.defaultModelId);
}

export function modelSupports(model, capability) {
  if (!model) return false;
  return !!model.capabilities[capability];
}

export function getModelDisplayName(settings, modelId) {
  const model = getModelById(settings, modelId);
  return model?.name || modelId || 'No model';
}