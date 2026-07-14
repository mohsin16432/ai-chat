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

export function autoDetectCapabilities(modelId) {
  const id = modelId.toLowerCase();
  
  // Vision detection
  const hasVision = 
    id.includes('vision') || 
    id.includes('-vl') || 
    id.includes('gpt-4o') || 
    id.includes('claude-3') || 
    id.includes('gemini-1.5') || 
    id.includes('gemini-2') ||
    id.includes('llava') ||
    id.includes('pixtral');

  // Image Generation detection
  const hasImageGen = 
    id.includes('dall-e') || 
    id.includes('stable-diffusion') || 
    id.includes('flux') || 
    id.includes('midjourney') || 
    id.includes('imagen');

  // Speech/Audio detection
  const hasSpeech = 
    id.includes('tts') || 
    id.includes('whisper') || 
    id.includes('speech') || 
    id.includes('audio');

  // Text capabilities (almost all models except pure image/audio generators)
  const hasText = !hasImageGen && !id.includes('whisper');

  return {
    text: hasText,
    vision: hasVision,
    imageGen: hasImageGen,
    speech: hasSpeech
  };
}

export async function discoverModels(baseUrl, apiKey) {
  const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const response = await fetch(`${cleanUrl}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();
  
  if (!json || !Array.isArray(json.data)) {
    throw new Error("Invalid response format. Expected a 'data' array.");
  }

  return json.data.map((m) => {
    const id = m.id;
    const name = m.metadata?.display_name || id.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    // Extract modalities from root or nested architecture properties (e.g. OpenRouter/LMStudio)
    const inputModalities = m.input_modalities || m.architecture?.input_modalities || null;
    const outputModalities = m.output_modalities || m.architecture?.output_modalities || null;

    let capabilities;

    if (inputModalities || outputModalities) {
      const inputs = Array.isArray(inputModalities) ? inputModalities.map(x => String(x).toLowerCase()) : [];
      const outputs = Array.isArray(outputModalities) ? outputModalities.map(x => String(x).toLowerCase()) : [];

      capabilities = {
        text: inputs.includes('text') || outputs.includes('text') || (inputs.length === 0 && outputs.length === 0),
        vision: inputs.includes('image') || inputs.includes('video'),
        imageGen: outputs.includes('image'),
        speech: inputs.includes('audio') || inputs.includes('speech') || outputs.includes('audio') || outputs.includes('speech')
      };
    } else {
      capabilities = autoDetectCapabilities(id);
    }

    return {
      id,
      name,
      capabilities,
      metadata: m.metadata || null // <-- PRESERVE METADATA FIELD FOR IMAGES
    };
  });
}