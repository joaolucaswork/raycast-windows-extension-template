# Template Development Guide

This guide provides detailed information for developing Windows-compatible Raycast extensions using this template.

**Enhanced with patterns from real-world Windows extensions**: This guide incorporates best practices discovered from analyzing the Everything Search and Kill Processes extensions by dougfernando.

## 🏗️ Architecture Overview

### Component Structure
```
Extension
├── Command Components (React)
├── Data Loading Functions
├── Action Handlers
├── Preferences Integration
└── Error Handling
```

### Key Patterns

#### 1. Data Loading with Caching
```typescript
import { useCachedPromise } from "@raycast/utils"

const { data, isLoading, revalidate } = useCachedPromise(loadDataFunction)
```

#### 2. Toast Notifications
```typescript
import { showToast, Toast } from "@raycast/api"

await showToast({
    style: Toast.Style.Success, // Success, Failure, Animated
    title: "Action completed",
    message: "Optional detailed message"
})
```

#### 3. Preferences Access
```typescript
import { getPreferenceValues } from "@raycast/api"

interface Preferences {
    settingName: string
    enableFeature: boolean
}

const preferences = getPreferenceValues<Preferences>()
```

## 🪟 Windows-Specific Development

### 1. External CLI Tool Integration

**Pattern from Everything Search Extension**:
```typescript
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

async function executeWindowsCommand(command: string): Promise<string> {
    try {
        // Critical: UTF-8 encoding for international characters
        const fullCommand = `chcp 65001 > nul && ${command}`
        const { stdout } = await execAsync(fullCommand)
        return stdout.trim()
    } catch (error) {
        throw new Error(`Command failed: ${error}`)
    }
}

// Usage example
const searchResults = await executeWindowsCommand(`es.exe -n 50 "${query}"`)
```

### 2. CSV Data Parsing

**Pattern from Kill Processes Extension**:
```typescript
function parseWindowsCSV(csvOutput: string): string[][] {
    return csvOutput
        .trim()
        .split(/\r?\n/) // Handle both \r\n and \n
        .map(line => line.replace(/"/g, "").split(","))
        .filter(parts => parts.length > 0 && parts[0]) // Filter empty lines
}

// Usage for process list
const processOutput = await executeWindowsCommand('tasklist /fo csv /nh')
const processes = parseWindowsCSV(processOutput).map(parts => ({
    name: parts[0],
    pid: parts[1],
    sessionName: parts[2],
    sessionNumber: parts[3],
    memUsage: parts[4]
}))
```

### 3. File System Operations

```typescript
import { promises as fs } from "fs"
import { join } from "path"

async function loadWindowsFiles(directory: string): Promise<FileItem[]> {
    try {
        const entries = await fs.readdir(directory, { withFileTypes: true })
        const files: FileItem[] = []
        
        for (const entry of entries) {
            const fullPath = join(directory, entry.name)
            const stats = await fs.stat(fullPath)
            
            files.push({
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory(),
                size: stats.size,
                modified: stats.mtime
            })
        }
        
        return files
    } catch (error) {
        console.error("Failed to load files:", error)
        return []
    }
}
```

## 🎨 UI Development Patterns

### 1. Dynamic Action Ordering

**Pattern from Everything Search Extension**:
```typescript
function ItemActions({ item, preferences }: { item: FileItem, preferences: Preferences }) {
    const primaryAction = preferences.useCustomAsDefault ? (
        <Action title="Custom Command" onAction={() => runCustomCommand(item)} />
    ) : (
        <Action title="Open" onAction={() => openFile(item)} />
    )
    
    const secondaryAction = preferences.useCustomAsDefault ? (
        <Action title="Open" onAction={() => openFile(item)} />
    ) : (
        <Action title="Custom Command" onAction={() => runCustomCommand(item)} />
    )
    
    return (
        <ActionPanel>
            {primaryAction}
            {secondaryAction}
            <Action title="Show in Explorer" onAction={() => showInExplorer(item)} />
        </ActionPanel>
    )
}
```

### 2. Detail View Toggle

```typescript
function ListItemWithDetail({ item }: { item: FileItem }) {
    const [showDetail, setShowDetail] = useState(false)
    
    if (showDetail) {
        return (
            <Detail
                markdown={generateFileMarkdown(item)}
                actions={
                    <ActionPanel>
                        <Action title="Back to List" onAction={() => setShowDetail(false)} />
                        <Action title="Open File" onAction={() => openFile(item)} />
                    </ActionPanel>
                }
            />
        )
    }
    
    return (
        <List.Item
            title={item.name}
            subtitle={item.path}
            actions={
                <ActionPanel>
                    <Action title="Show Details" onAction={() => setShowDetail(true)} />
                    <Action title="Open" onAction={() => openFile(item)} />
                </ActionPanel>
            }
        />
    )
}
```

## 🔧 Advanced Patterns

### 1. Bulk Operations with Error Recovery

**Pattern from Kill Processes Extension**:
```typescript
async function processItemsWithRecovery<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    onProgress?: (completed: number, total: number) => void
): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] }
    
    for (let i = 0; i < items.length; i++) {
        try {
            await processor(items[i])
            results.successful++
        } catch (error) {
            results.failed++
            results.errors.push(error instanceof Error ? error.message : "Unknown error")
        }
        
        onProgress?.(i + 1, items.length)
    }
    
    return results
}

// Usage example
const results = await processItemsWithRecovery(
    selectedProcesses,
    async (process) => {
        await executeWindowsCommand(`taskkill /PID ${process.pid} /F`)
    },
    (completed, total) => {
        console.log(`Progress: ${completed}/${total}`)
    }
)

await showToast({
    style: results.failed === 0 ? Toast.Style.Success : Toast.Style.Failure,
    title: `Processed ${results.successful} items`,
    message: results.failed > 0 ? `${results.failed} failed` : undefined
})
```

### 2. Custom Command Parsing

**Pattern from Everything Search Extension**:
```typescript
function parseCustomCommand(command: string, filePath: string): string[] {
    // Parse command with quoted arguments and placeholders
    const commandParts = command.match(/"[^"]+"|\\S+/g) || []
    
    return commandParts.map(part => {
        // Remove quotes and replace placeholders
        const cleaned = part.replace(/^"|"$/g, "")
        return cleaned.replace("%s", filePath)
    })
}

async function runCustomCommand(filePath: string, command: string): Promise<void> {
    try {
        const args = parseCustomCommand(command, filePath)
        const fullCommand = args.join(" ")
        
        await executeWindowsCommand(fullCommand)
        
        await showToast({
            style: Toast.Style.Success,
            title: "Command executed",
            message: `Ran: ${args[0]}`
        })
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Command failed",
            message: error instanceof Error ? error.message : "Unknown error"
        })
    }
}
```

### 3. Memory-Efficient Data Loading

```typescript
async function loadLargeDataset(
    loader: () => Promise<any[]>,
    maxItems: number = 1000
): Promise<any[]> {
    try {
        const allData = await loader()
        
        // Limit data size to prevent memory issues
        if (allData.length > maxItems) {
            console.warn(`Dataset truncated from ${allData.length} to ${maxItems} items`)
            return allData.slice(0, maxItems)
        }
        
        return allData
    } catch (error) {
        console.error("Failed to load dataset:", error)
        return []
    }
}
```

## 🚀 Performance Optimization

### 1. Debounced Search
```typescript
import { useState, useEffect } from "react"

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)
        
        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])
    
    return debouncedValue
}

// Usage in component
function SearchComponent() {
    const [searchText, setSearchText] = useState("")
    const debouncedSearchText = useDebounce(searchText, 300)
    
    const { data, isLoading } = useCachedPromise(
        async () => searchFiles(debouncedSearchText),
        [debouncedSearchText]
    )
    
    return (
        <List
            onSearchTextChange={setSearchText}
            isLoading={isLoading}
        >
            {/* Render results */}
        </List>
    )
}
```

### 2. Efficient File Operations
```typescript
import { promises as fs } from "fs"

async function getFileStats(filePath: string): Promise<FileStats | null> {
    try {
        const stats = await fs.stat(filePath)
        return {
            size: stats.size,
            modified: stats.mtime,
            isDirectory: stats.isDirectory()
        }
    } catch (error) {
        // File might not exist or be inaccessible
        return null
    }
}

// Batch file operations
async function getMultipleFileStats(filePaths: string[]): Promise<(FileStats | null)[]> {
    return Promise.all(filePaths.map(getFileStats))
}
```

## 🧪 Testing and Debugging

### 1. Error Simulation
```typescript
// Add debug mode for testing error scenarios
const DEBUG_MODE = process.env.NODE_ENV === "development"

async function simulateError(operation: () => Promise<void>, errorRate: number = 0.1): Promise<void> {
    if (DEBUG_MODE && Math.random() < errorRate) {
        throw new Error("Simulated error for testing")
    }
    
    await operation()
}
```

### 2. Logging Utilities
```typescript
function debugLog(message: string, data?: any): void {
    if (process.env.NODE_ENV === "development") {
        console.log(`[DEBUG] ${message}`, data || "")
    }
}

function errorLog(message: string, error: any): void {
    console.error(`[ERROR] ${message}`, error)
    // In production, you might want to send this to a logging service
}
```

## 📚 Best Practices Summary

1. **Always use UTF-8 encoding** for Windows commands (`chcp 65001`)
2. **Handle partial failures gracefully** in bulk operations
3. **Provide comprehensive user feedback** with toast notifications
4. **Implement debounced search** for better performance
5. **Limit data size** to prevent memory issues
6. **Use proper error boundaries** and recovery mechanisms
7. **Test with various Windows configurations** and edge cases
8. **Leverage existing Windows tools** rather than reimplementing functionality

---

*This guide is based on analysis of real-world Windows Raycast extensions. For more comprehensive development guidance, see the [Main Development Guide](../development-guide/).*
