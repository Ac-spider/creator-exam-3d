function labelPromise(promise) {
  const labels = {
    resident_memory: 'resident thread',
    world_consequence: 'world consequence',
    rescue_thread: 'rescue thread',
    aftermath: 'aftermath',
    fallback_path: 'fallback path'
  };
  return labels[promise] || promise || 'unknown';
}

export function buildExplorationChoiceViewModel(choices = []) {
  return choices.map(choice => ({
    id: choice.id,
    title: choice.title,
    description: choice.description,
    badge: labelPromise(choice.promise),
    meta: `risk: ${choice.risk} · hooks: ${choice.hookTypes.join(', ')}`,
    priority: choice.priority,
    disabled: choice.status !== 'available'
  }));
}
