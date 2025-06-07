export interface Word {
  word: string;
  definition: string;
}

export async function loadAllWords(): Promise<Word[]> {
  try {
    const response = await fetch('/api/words');
    if (!response.ok) {
      throw new Error('Failed to load words');
    }
    return response.json();
  } catch (error) {
    console.error('Error loading words:', error);
    return [];
  }
} 