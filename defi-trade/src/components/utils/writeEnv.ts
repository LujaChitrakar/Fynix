export default function writeToEnv(key: string, value: string): void {
  try {
    // Save to localStorage
    localStorage.setItem(key, value);
    console.log(`Saved ${key}=${value} to localStorage.`);
  } catch (error) {
    console.error(`Error saving to localStorage: ${error}`);
  }
}
