/**
 * Advanced File Search Manager Example
 * 
 * This example demonstrates advanced patterns including:
 * - Complex state management with multiple data sources
 * - Debounced search with caching
 * - File system operations with error recovery
 * - Bulk operations with progress tracking
 * - Context-aware actions based on file types
 * - Windows-specific file handling
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  List, 
  ActionPanel, 
  Action, 
  showToast, 
  Toast, 
  Icon,
  getPreferenceValues,
  showInFinder,
  trash,
  open,
  Alert,
  confirmAlert,
  Detail
} from "@raycast/api";
import { useCachedPromise, useDebounce } from "@raycast/utils";
import { promises as fs } from "fs";
import { join, dirname, basename, extname } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Interfaces
interface FileItem {
  path: string;
  name: string;
  size: number;
  modified: Date;
  type: "file" | "directory";
  extension?: string;
  isHidden: boolean;
}

interface SearchResult {
  files: FileItem[];
  totalCount: number;
  searchTime: number;
}

interface Preferences {
  searchPaths: string;
  maxResults: string;
  includeHidden: boolean;
  useEverything: boolean;
  excludePatterns: string;
}

// Utility functions
async function runWindowsCommand(command: string): Promise<string> {
  try {
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const { stdout } = await execAsync(fullCommand, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30000
    });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error}`);
  }
}

async function searchWithEverything(query: string, maxResults: number): Promise<FileItem[]> {
  try {
    const command = `es.exe -n ${maxResults} -size -date-modified "${query}"`;
    const output = await runWindowsCommand(command);
    
    const lines = output.split(/\r?\n/).filter(line => line.trim());
    const files: FileItem[] = [];
    
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const path = parts[0];
        const size = parseInt(parts[1]) || 0;
        const modified = new Date(parts[2]);
        
        files.push({
          path,
          name: basename(path),
          size,
          modified,
          type: await isDirectory(path) ? "directory" : "file",
          extension: extname(path).toLowerCase(),
          isHidden: basename(path).startsWith('.')
        });
      }
    }
    
    return files;
  } catch (error) {
    console.error("Everything search failed:", error);
    return [];
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function searchFileSystem(
  query: string, 
  searchPaths: string[], 
  maxResults: number,
  includeHidden: boolean,
  excludePatterns: string[]
): Promise<FileItem[]> {
  const files: FileItem[] = [];
  const queryLower = query.toLowerCase();
  
  for (const searchPath of searchPaths) {
    try {
      await searchDirectory(searchPath, queryLower, files, maxResults, includeHidden, excludePatterns);
      if (files.length >= maxResults) break;
    } catch (error) {
      console.error(`Failed to search ${searchPath}:`, error);
    }
  }
  
  return files.slice(0, maxResults);
}

async function searchDirectory(
  dirPath: string,
  query: string,
  results: FileItem[],
  maxResults: number,
  includeHidden: boolean,
  excludePatterns: string[],
  depth: number = 0
): Promise<void> {
  if (depth > 5 || results.length >= maxResults) return; // Limit recursion depth
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (results.length >= maxResults) break;
      
      const fullPath = join(dirPath, entry.name);
      const isHidden = entry.name.startsWith('.');
      
      // Skip hidden files if not included
      if (isHidden && !includeHidden) continue;
      
      // Skip excluded patterns
      if (excludePatterns.some(pattern => entry.name.includes(pattern))) continue;
      
      // Check if name matches query
      if (entry.name.toLowerCase().includes(query)) {
        try {
          const stats = await fs.stat(fullPath);
          results.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            modified: stats.mtime,
            type: entry.isDirectory() ? "directory" : "file",
            extension: entry.isFile() ? extname(entry.name).toLowerCase() : undefined,
            isHidden
          });
        } catch (error) {
          console.error(`Failed to stat ${fullPath}:`, error);
        }
      }
      
      // Recurse into directories
      if (entry.isDirectory() && !isHidden) {
        await searchDirectory(fullPath, query, results, maxResults, includeHidden, excludePatterns, depth + 1);
      }
    }
  } catch (error) {
    console.error(`Failed to read directory ${dirPath}:`, error);
  }
}

// Formatting utilities
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getFileIcon(file: FileItem): Icon {
  if (file.type === "directory") return Icon.Folder;
  
  const iconMap: Record<string, Icon> = {
    '.txt': Icon.Document,
    '.md': Icon.Document,
    '.pdf': Icon.Document,
    '.doc': Icon.Document,
    '.docx': Icon.Document,
    '.jpg': Icon.Image,
    '.jpeg': Icon.Image,
    '.png': Icon.Image,
    '.gif': Icon.Image,
    '.mp4': Icon.Video,
    '.avi': Icon.Video,
    '.mp3': Icon.Music,
    '.wav': Icon.Music,
    '.zip': Icon.Archive,
    '.rar': Icon.Archive,
    '.exe': Icon.Gear,
    '.js': Icon.Code,
    '.ts': Icon.Code,
    '.tsx': Icon.Code,
    '.py': Icon.Code,
    '.java': Icon.Code
  };
  
  return iconMap[file.extension || ''] || Icon.Document;
}

// Main component
export default function FileSearchManager() {
  const [searchText, setSearchText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  
  const preferences = getPreferenceValues<Preferences>();
  const debouncedSearchText = useDebounce(searchText, 300);
  
  const searchPaths = useMemo(() => {
    return preferences.searchPaths
      .split(',')
      .map(path => path.trim())
      .filter(path => path.length > 0);
  }, [preferences.searchPaths]);
  
  const excludePatterns = useMemo(() => {
    return preferences.excludePatterns
      .split(',')
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0);
  }, [preferences.excludePatterns]);
  
  const maxResults = parseInt(preferences.maxResults) || 100;
  
  // Search function
  const searchFiles = useCallback(async (query: string): Promise<SearchResult> => {
    if (!query.trim()) {
      return { files: [], totalCount: 0, searchTime: 0 };
    }
    
    const startTime = Date.now();
    setIsSearching(true);
    
    try {
      let files: FileItem[] = [];
      
      // Use Everything if available and enabled
      if (preferences.useEverything) {
        try {
          files = await searchWithEverything(query, maxResults);
        } catch (error) {
          console.warn("Everything search failed, falling back to filesystem search");
          files = await searchFileSystem(query, searchPaths, maxResults, preferences.includeHidden, excludePatterns);
        }
      } else {
        files = await searchFileSystem(query, searchPaths, maxResults, preferences.includeHidden, excludePatterns);
      }
      
      const searchTime = Date.now() - startTime;
      return { files, totalCount: files.length, searchTime };
    } finally {
      setIsSearching(false);
    }
  }, [searchPaths, maxResults, preferences.includeHidden, preferences.useEverything, excludePatterns]);
  
  // Use cached promise for search results
  const { data: searchResult, isLoading } = useCachedPromise(
    searchFiles,
    [debouncedSearchText],
    {
      keepPreviousData: true,
      initialData: { files: [], totalCount: 0, searchTime: 0 }
    }
  );
  
  // File operations
  const handleOpenFile = useCallback(async (file: FileItem) => {
    try {
      await open(file.path);
      await showToast({
        style: Toast.Style.Success,
        title: "File opened",
        message: file.name
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open file",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, []);
  
  const handleShowInFinder = useCallback(async (file: FileItem) => {
    try {
      await showInFinder(file.path);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to show in finder",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, []);
  
  const handleDeleteFile = useCallback(async (file: FileItem) => {
    const confirmed = await confirmAlert({
      title: "Delete File",
      message: `Are you sure you want to delete "${file.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive
      }
    });
    
    if (!confirmed) return;
    
    try {
      await trash(file.path);
      await showToast({
        style: Toast.Style.Success,
        title: "File deleted",
        message: file.name
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete file",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, []);
  
  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;
    
    const confirmed = await confirmAlert({
      title: "Delete Files",
      message: `Are you sure you want to delete ${selectedFiles.size} selected files?`,
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive
      }
    });
    
    if (!confirmed) return;
    
    const filesToDelete = Array.from(selectedFiles);
    let successCount = 0;
    let errorCount = 0;
    
    for (const filePath of filesToDelete) {
      try {
        await trash(filePath);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete ${filePath}:`, error);
        errorCount++;
      }
    }
    
    setSelectedFiles(new Set());
    
    await showToast({
      style: errorCount === 0 ? Toast.Style.Success : Toast.Style.Failure,
      title: `Deleted ${successCount} files`,
      message: errorCount > 0 ? `${errorCount} files failed to delete` : undefined
    });
  }, [selectedFiles]);
  
  const toggleFileSelection = useCallback((filePath: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  }, []);
  
  return (
    <List
      isLoading={isLoading || isSearching}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search files and directories..."
      throttle={true}
    >
      {searchResult.files.length === 0 && debouncedSearchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No files found"
          description={`No files match "${debouncedSearchText}"`}
        />
      ) : (
        <>
          {searchResult.totalCount > 0 && (
            <List.Section
              title={`Found ${searchResult.totalCount} files (${searchResult.searchTime}ms)`}
            >
              {searchResult.files.map((file) => (
                <List.Item
                  key={file.path}
                  icon={getFileIcon(file)}
                  title={file.name}
                  subtitle={dirname(file.path)}
                  accessories={[
                    { text: formatFileSize(file.size) },
                    { text: formatDate(file.modified) },
                    selectedFiles.has(file.path) ? { icon: Icon.Checkmark } : {}
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="File Actions">
                        <Action
                          title="Open"
                          icon={Icon.ArrowRight}
                          onAction={() => handleOpenFile(file)}
                        />
                        <Action
                          title="Show in Finder"
                          icon={Icon.Finder}
                          onAction={() => handleShowInFinder(file)}
                        />
                        <Action
                          title={selectedFiles.has(file.path) ? "Deselect" : "Select"}
                          icon={selectedFiles.has(file.path) ? Icon.Circle : Icon.Checkmark}
                          onAction={() => toggleFileSelection(file.path)}
                        />
                      </ActionPanel.Section>
                      
                      <ActionPanel.Section title="Copy Actions">
                        <Action.CopyToClipboard
                          title="Copy Path"
                          content={file.path}
                        />
                        <Action.CopyToClipboard
                          title="Copy Name"
                          content={file.name}
                        />
                      </ActionPanel.Section>
                      
                      <ActionPanel.Section title="Dangerous Actions">
                        <Action
                          title="Delete File"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleDeleteFile(file)}
                        />
                        {selectedFiles.size > 0 && (
                          <Action
                            title={`Delete ${selectedFiles.size} Selected Files`}
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={handleBulkDelete}
                          />
                        )}
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

/**
 * Package.json preferences configuration:
 * 
 * "preferences": [
 *   {
 *     "name": "searchPaths",
 *     "title": "Search Paths",
 *     "description": "Comma-separated list of directories to search",
 *     "type": "textfield",
 *     "default": "C:\\Users\\%USERNAME%\\Documents,C:\\Users\\%USERNAME%\\Desktop",
 *     "required": true
 *   },
 *   {
 *     "name": "maxResults",
 *     "title": "Maximum Results",
 *     "description": "Maximum number of search results to display",
 *     "type": "textfield",
 *     "default": "100",
 *     "required": false
 *   },
 *   {
 *     "name": "includeHidden",
 *     "title": "Include Hidden Files",
 *     "description": "Include hidden files and directories in search results",
 *     "type": "checkbox",
 *     "default": false,
 *     "required": false,
 *     "label": "Show hidden files"
 *   },
 *   {
 *     "name": "useEverything",
 *     "title": "Use Everything Search",
 *     "description": "Use Everything search tool if available (faster)",
 *     "type": "checkbox",
 *     "default": true,
 *     "required": false,
 *     "label": "Enable Everything search"
 *   },
 *   {
 *     "name": "excludePatterns",
 *     "title": "Exclude Patterns",
 *     "description": "Comma-separated list of patterns to exclude from search",
 *     "type": "textfield",
 *     "default": "node_modules,.git,Thumbs.db",
 *     "required": false
 *   }
 * ]
 */
