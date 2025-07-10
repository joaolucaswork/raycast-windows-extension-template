# Common Utilities and Helpers Reference

A comprehensive collection of utility functions and patterns commonly used across Raycast extensions, with Windows-specific adaptations.

## 📁 File System Utilities

### Cross-Platform Path Handling
```typescript
import { join, resolve, normalize, dirname, basename, extname } from "path";
import { homedir, tmpdir } from "os";
import { promises as fs } from "fs";

// ✅ Safe path construction
export function safePath(...segments: string[]): string {
  return normalize(join(...segments));
}

// ✅ Get user directories
export function getUserDirectories() {
  const home = homedir();
  return {
    home,
    documents: join(home, "Documents"),
    downloads: join(home, "Downloads"),
    desktop: join(home, "Desktop"),
    pictures: join(home, "Pictures"),
    // Windows-specific
    appData: process.env.APPDATA || join(home, "AppData", "Roaming"),
    localAppData: process.env.LOCALAPPDATA || join(home, "AppData", "Local"),
    temp: tmpdir()
  };
}

// ✅ File existence check
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ✅ Safe file reading
export async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

// ✅ Ensure directory exists
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as any).code !== "EEXIST") {
      throw error;
    }
  }
}
```

### File Type Detection
```typescript
// ✅ File type utilities
export function getFileType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  
  const typeMap: Record<string, string> = {
    // Documents
    ".pdf": "PDF Document",
    ".doc": "Word Document",
    ".docx": "Word Document",
    ".txt": "Text File",
    ".md": "Markdown File",
    
    // Images
    ".jpg": "JPEG Image",
    ".jpeg": "JPEG Image", 
    ".png": "PNG Image",
    ".gif": "GIF Image",
    ".svg": "SVG Image",
    
    // Code
    ".js": "JavaScript File",
    ".ts": "TypeScript File",
    ".tsx": "TypeScript React File",
    ".py": "Python File",
    ".java": "Java File",
    
    // Archives
    ".zip": "ZIP Archive",
    ".rar": "RAR Archive",
    ".7z": "7-Zip Archive"
  };
  
  return typeMap[ext] || "Unknown File";
}

export function isImageFile(filePath: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"];
  return imageExts.includes(extname(filePath).toLowerCase());
}
```

## 🔧 Command Execution Utilities

### Windows Command Execution
```typescript
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ✅ Windows command execution with proper encoding
export async function runWindowsCommand(
  command: string,
  options: { timeout?: number; cwd?: string } = {}
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 10000, cwd } = options;
  
  try {
    // Set UTF-8 encoding for international characters
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const result = await execAsync(fullCommand, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024, // 1MB buffer
      timeout,
      cwd
    });
    
    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim()
    };
  } catch (error) {
    throw new WindowsCommandError(error, command);
  }
}

// ✅ PowerShell command execution
export async function runPowerShellCommand(
  command: string,
  options: { timeout?: number } = {}
): Promise<string> {
  const escapedCommand = command.replace(/"/g, '`"');
  const psCommand = `powershell.exe -NoProfile -Command "${escapedCommand}"`;
  
  const result = await runWindowsCommand(psCommand, options);
  return result.stdout;
}

// ✅ Command availability check
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await runWindowsCommand(`where ${command}`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// ✅ Custom error class for Windows commands
export class WindowsCommandError extends Error {
  constructor(originalError: any, command: string) {
    let message = `Command failed: ${command}`;
    
    if (originalError.code === "ENOENT") {
      message = "Command not found. Please ensure the tool is installed and in PATH.";
    } else if (originalError.code === "EACCES") {
      message = "Access denied. Administrator privileges may be required.";
    } else if (originalError.code === "EPERM") {
      message = "Operation not permitted. File may be in use or protected.";
    } else if (originalError.stderr) {
      message = originalError.stderr;
    }
    
    super(message);
    this.name = "WindowsCommandError";
  }
}
```

## 📊 Data Processing Utilities

### CSV and Structured Data Parsing
```typescript
// ✅ Windows CSV parsing (handles quotes and commas)
export function parseWindowsCSV(csvOutput: string): string[][] {
  const lines = csvOutput.trim().split(/\r?\n/);
  const result: string[][] = [];
  
  for (const line of lines) {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    fields.push(current.trim());
    
    if (fields.length > 0 && fields[0]) {
      result.push(fields);
    }
  }
  
  return result;
}

// ✅ JSON parsing with error handling
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

// ✅ Data validation utilities
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### Text Processing
```typescript
// ✅ String utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ✅ Search utilities
export function fuzzyMatch(query: string, text: string): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

export function highlightMatches(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '**$1**');
}
```

## 🎨 Formatting Utilities

### Date and Time Formatting
```typescript
// ✅ Date formatting utilities
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(d);
}
```

### Size and Number Formatting
```typescript
// ✅ File size formatting
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// ✅ Number formatting
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatPercentage(value: number, total: number): string {
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}
```

## 🔄 Async Utilities

### Debouncing and Throttling
```typescript
// ✅ Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// ✅ Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ✅ Retry utility
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}
```

## 🎯 React Hooks

### Custom Hooks for Common Patterns
```typescript
import { useState, useEffect, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";

// ✅ Search hook
export function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  initialSearchText: string = ""
) {
  const [searchText, setSearchText] = useState(initialSearchText);
  
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    
    const searchLower = searchText.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return typeof value === 'string' && 
               value.toLowerCase().includes(searchLower);
      })
    );
  }, [items, searchText, searchFields]);
  
  return { filteredItems, searchText, setSearchText };
}

// ✅ Local storage hook
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  
  useEffect(() => {
    LocalStorage.getItem(key).then(stored => {
      if (stored) {
        setValue(JSON.parse(stored));
      }
    });
  }, [key]);
  
  const setStoredValue = async (newValue: T) => {
    setValue(newValue);
    await LocalStorage.setItem(key, JSON.stringify(newValue));
  };
  
  return [value, setStoredValue] as const;
}

// ✅ Preferences hook
export function usePreferences<T>(): T {
  return getPreferenceValues<T>();
}
```

## 🛡️ Error Handling Utilities

### Comprehensive Error Management
```typescript
import { showToast, Toast, captureException } from "@raycast/api";

// ✅ Error handling utility
export async function handleError(
  error: unknown,
  context: string,
  showToUser: boolean = true
): Promise<void> {
  console.error(`${context}:`, error);
  
  // Report to Raycast for debugging
  captureException(error);
  
  if (!showToUser) return;
  
  let title = `${context} failed`;
  let message = "An unexpected error occurred";
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  await showToast({
    style: Toast.Style.Failure,
    title,
    message
  });
}

// ✅ Safe async wrapper
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    await handleError(error, context);
    return fallback;
  }
}
```

---

*These utilities provide a solid foundation for building robust Raycast extensions with proper error handling, cross-platform compatibility, and excellent user experience.*
