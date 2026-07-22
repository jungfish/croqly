const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
};

const FALLBACK_MESSAGE = 'Une erreur est survenue. Réessaie dans un instant.';

export function toFriendlyAuthError(rawMessage: string): string {
  return AUTH_ERROR_MESSAGES[rawMessage] ?? FALLBACK_MESSAGE;
}
