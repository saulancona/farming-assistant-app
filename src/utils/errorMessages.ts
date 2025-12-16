/**
 * User-friendly error messages
 * Converts technical errors into messages users can understand
 */

export interface UserError {
  title: string;
  message: string;
  action?: string;
}

/**
 * Get user-friendly error message from error object
 */
export function getUserErrorMessage(error: any): UserError {
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('Failed to fetch')) {
    return {
      title: 'Connection Lost',
      message: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Your changes will be saved offline and synced when you reconnect.'
    };
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return {
      title: 'Request Timed Out',
      message: 'The server took too long to respond. This might be due to slow internet.',
      action: 'Please try again in a moment.'
    };
  }

  // Authentication errors
  if (error.status === 401 || error.message?.includes('Unauthorized')) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again.',
      action: 'You will be redirected to the login page.'
    };
  }

  // Permission errors
  if (error.status === 403 || error.message?.includes('Forbidden')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      action: 'Please contact support if you believe this is an error.'
    };
  }

  // Not found errors
  if (error.status === 404) {
    return {
      title: 'Not Found',
      message: 'The requested item could not be found.',
      action: 'It may have been deleted or moved.'
    };
  }

  // Rate limit errors
  if (error.status === 429) {
    return {
      title: 'Too Many Requests',
      message: 'You\'re making too many requests. Please slow down.',
      action: 'Wait a moment before trying again.'
    };
  }

  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return {
      title: 'Server Error',
      message: 'Something went wrong on our end. Our team has been notified.',
      action: 'Please try again in a few minutes.'
    };
  }

  // Supabase specific errors
  if (error.code === 'PGRST116') {
    return {
      title: 'No Match Found',
      message: 'Could not find the item you\'re looking for.',
      action: 'Please check the details and try again.'
    };
  }

  if (error.code?.startsWith('PGRST')) {
    return {
      title: 'Database Error',
      message: 'There was an issue accessing your data.',
      action: 'Please try again or contact support if this persists.'
    };
  }

  // Microphone/audio errors
  if (error.name === 'NotAllowedError' || error.message?.includes('microphone')) {
    return {
      title: 'Microphone Access Denied',
      message: 'Please allow microphone access in your browser settings.',
      action: 'Click the camera/microphone icon in your browser\'s address bar.'
    };
  }

  // AI API errors
  if (error.message?.includes('Whisper') || error.message?.includes('transcription')) {
    return {
      title: 'Speech Recognition Failed',
      message: 'Could not transcribe your audio. The audio might be unclear or too quiet.',
      action: 'Try speaking closer to the microphone and in a quieter environment.'
    };
  }

  if (error.message?.includes('Gemini') || error.message?.includes('parsing')) {
    return {
      title: 'Command Not Understood',
      message: 'I couldn\'t understand that command. Please try rephrasing.',
      action: 'Try saying something like: "I planted maize in field 1" or "How much have I spent?"'
    };
  }

  // Validation errors
  if (error.message?.includes('invalid') || error.message?.includes('validation')) {
    return {
      title: 'Invalid Data',
      message: error.message || 'The data you entered is not valid.',
      action: 'Please check your input and try again.'
    };
  }

  // Default fallback
  return {
    title: 'Something Went Wrong',
    message: error.message || 'An unexpected error occurred.',
    action: 'Please try again. If the problem persists, contact support.'
  };
}

/**
 * Get voice-friendly error message
 */
export function getVoiceErrorMessage(error: any): string {
  const userError = getUserErrorMessage(error);

  // Combine title and message for voice
  let message = `${userError.title}. ${userError.message}`;

  // Add action if present
  if (userError.action) {
    message += ` ${userError.action}`;
  }

  return message;
}
