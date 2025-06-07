import fs from 'fs';
import path from 'path';

export interface Word {
  word: string;
  definition: string;
}

export async function loadAllWords(): Promise<Word[]> {
  const wordsDir = path.join(process.cwd(), 'app', 'words');
  const files = fs.readdirSync(wordsDir).filter(file => file.endsWith('.txt'));
  
  const allWords: Word[] = [];
  
  for (const file of files) {
    const filePath = path.join(wordsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      const [word, ...definitionParts] = trimmedLine.split(' ');
      if (!word) continue;
      
      allWords.push({
        word: word.trim(),
        definition: definitionParts.join(' ').trim()
      });
    }
  }
  
  return allWords;
} 