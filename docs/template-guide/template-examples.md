# Template Examples

This document provides practical examples of how to extend the template for common Windows-specific use cases.

**Note**: These examples incorporate patterns and techniques discovered from analyzing real-world Windows Raycast extensions, including the Everything Search and Kill Processes extensions by dougfernando.

## 🗂️ File Manager Extension

```typescript
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { readdirSync, statSync } from "fs"
import { join } from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface FileItem {
    name: string
    path: string
    isDirectory: boolean
    size?: number
    modified?: Date
}

async function loadFiles(directory: string): Promise<FileItem[]> {
    try {
        const items = readdirSync(directory)
        return items.map(name => {
            const fullPath = join(directory, name)
            const stats = statSync(fullPath)
            return {
                name,
                path: fullPath,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime
            }
        })
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load directory",
            message: error instanceof Error ? error.message : "Unknown error"
        })
        return []
    }
}

async function openInExplorer(path: string): Promise<void> {
    try {
        await execAsync(`explorer.exe "${path}"`)
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Failed to open in Explorer",
            message: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

export default function FileManager() {
    const { data: files, isLoading } = useCachedPromise(
        () => loadFiles(process.env.USERPROFILE || "C:\\"),
        []
    )

    return (
        <List isLoading={isLoading}>
            {files?.map((file) => (
                <List.Item
                    key={file.path}
                    icon={file.isDirectory ? Icon.Folder : Icon.Document}
                    title={file.name}
                    subtitle={file.isDirectory ? "Folder" : `${file.size} bytes`}
                    accessories={[
                        { text: file.modified?.toLocaleDateString() }
                    ]}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Open in Explorer"
                                onAction={() => openInExplorer(file.path)}
                            />
                            <Action.CopyToClipboard
                                title="Copy Path"
                                content={file.path}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    )
}
```

## 💻 System Information Extension

```typescript
import { Detail, ActionPanel, Action } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface SystemInfo {
    computerName: string
    userName: string
    osVersion: string
    totalMemory: string
    availableMemory: string
    processor: string
    uptime: string
}

async function getSystemInfo(): Promise<SystemInfo> {
    try {
        // Use UTF-8 encoding for international characters
        const commands = {
            computerName: 'chcp 65001 > nul && echo %COMPUTERNAME%',
            userName: 'chcp 65001 > nul && echo %USERNAME%',
            osVersion: 'chcp 65001 > nul && ver',
            memory: 'chcp 65001 > nul && wmic computersystem get TotalPhysicalMemory /value',
            processor: 'chcp 65001 > nul && wmic cpu get name /value',
            uptime: 'chcp 65001 > nul && wmic os get lastbootuptime /value'
        }

        const results = await Promise.all([
            execAsync(commands.computerName),
            execAsync(commands.userName),
            execAsync(commands.osVersion),
            execAsync(commands.memory),
            execAsync(commands.processor),
            execAsync(commands.uptime)
        ])

        return {
            computerName: results[0].stdout.trim(),
            userName: results[1].stdout.trim(),
            osVersion: results[2].stdout.trim(),
            totalMemory: extractWMICValue(results[3].stdout, 'TotalPhysicalMemory'),
            availableMemory: "N/A", // Would need additional command
            processor: extractWMICValue(results[4].stdout, 'Name'),
            uptime: extractWMICValue(results[5].stdout, 'LastBootUpTime')
        }
    } catch (error) {
        throw new Error(`Failed to get system info: ${error}`)
    }
}

function extractWMICValue(output: string, key: string): string {
    const lines = output.split('\n')
    const line = lines.find(l => l.includes(`${key}=`))
    return line ? line.split('=')[1]?.trim() || "Unknown" : "Unknown"
}

function formatBytes(bytes: string): string {
    const num = parseInt(bytes)
    if (isNaN(num)) return bytes
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = num
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`
}

export default function SystemInformation() {
    const { data: systemInfo, isLoading, error } = useCachedPromise(getSystemInfo, [])

    if (error) {
        return (
            <Detail
                markdown="# Error\n\nFailed to load system information."
                actions={
                    <ActionPanel>
                        <Action title="Retry" onAction={() => window.location.reload()} />
                    </ActionPanel>
                }
            />
        )
    }

    const markdown = systemInfo ? `
# System Information

## Computer Details
- **Computer Name**: ${systemInfo.computerName}
- **User Name**: ${systemInfo.userName}
- **OS Version**: ${systemInfo.osVersion}

## Hardware
- **Processor**: ${systemInfo.processor}
- **Total Memory**: ${formatBytes(systemInfo.totalMemory)}

## System Status
- **Last Boot**: ${systemInfo.uptime}
    ` : "Loading..."

    return (
        <Detail
            isLoading={isLoading}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action.CopyToClipboard
                        title="Copy System Info"
                        content={JSON.stringify(systemInfo, null, 2)}
                    />
                </ActionPanel>
            }
        />
    )
}
```

## 🔧 Windows Services Manager

```typescript
import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface WindowsService {
    name: string
    displayName: string
    status: string
    startType: string
}

async function getWindowsServices(): Promise<WindowsService[]> {
    try {
        const command = 'chcp 65001 > nul && sc query type= service state= all'
        const { stdout } = await execAsync(command)
        
        return parseServiceOutput(stdout)
    } catch (error) {
        throw new Error(`Failed to get services: ${error}`)
    }
}

function parseServiceOutput(output: string): WindowsService[] {
    const services: WindowsService[] = []
    const lines = output.split('\n')
    
    let currentService: Partial<WindowsService> = {}
    
    for (const line of lines) {
        const trimmed = line.trim()
        
        if (trimmed.startsWith('SERVICE_NAME:')) {
            if (currentService.name) {
                services.push(currentService as WindowsService)
            }
            currentService = { name: trimmed.split(':')[1]?.trim() }
        } else if (trimmed.startsWith('DISPLAY_NAME:')) {
            currentService.displayName = trimmed.split(':')[1]?.trim()
        } else if (trimmed.startsWith('STATE:')) {
            const statePart = trimmed.split(':')[1]?.trim()
            currentService.status = statePart?.split(' ')[1] || 'Unknown'
        }
    }
    
    if (currentService.name) {
        services.push(currentService as WindowsService)
    }
    
    return services.filter(s => s.name && s.displayName)
}

async function controlService(serviceName: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    try {
        let command = ''
        switch (action) {
            case 'start':
                command = `net start "${serviceName}"`
                break
            case 'stop':
                command = `net stop "${serviceName}"`
                break
            case 'restart':
                command = `net stop "${serviceName}" && net start "${serviceName}"`
                break
        }
        
        await execAsync(`chcp 65001 > nul && ${command}`)
        
        await showToast({
            style: Toast.Style.Success,
            title: `Service ${action}ed`,
            message: serviceName
        })
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: `Failed to ${action} service`,
            message: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

export default function WindowsServicesManager() {
    const { data: services, isLoading, revalidate } = useCachedPromise(getWindowsServices, [])

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search services...">
            {services?.map((service) => (
                <List.Item
                    key={service.name}
                    icon={service.status === 'RUNNING' ? Icon.CheckCircle : Icon.Circle}
                    title={service.displayName || service.name}
                    subtitle={service.name}
                    accessories={[
                        { text: service.status }
                    ]}
                    actions={
                        <ActionPanel>
                            {service.status === 'RUNNING' ? (
                                <Action
                                    title="Stop Service"
                                    icon={Icon.Stop}
                                    onAction={() => controlService(service.name, 'stop').then(revalidate)}
                                />
                            ) : (
                                <Action
                                    title="Start Service"
                                    icon={Icon.Play}
                                    onAction={() => controlService(service.name, 'start').then(revalidate)}
                                />
                            )}
                            <Action
                                title="Restart Service"
                                icon={Icon.ArrowClockwise}
                                onAction={() => controlService(service.name, 'restart').then(revalidate)}
                            />
                            <Action.CopyToClipboard
                                title="Copy Service Name"
                                content={service.name}
                            />
                            <Action
                                title="Refresh List"
                                icon={Icon.ArrowClockwise}
                                onAction={revalidate}
                                shortcut={{ modifiers: ["cmd"], key: "r" }}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    )
}
```

## 🚀 Quick Application Launcher

```typescript
import { List, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { exec } from "child_process"
import { promisify } from "util"
import { readdirSync, statSync } from "fs"
import { join, extname } from "path"

const execAsync = promisify(exec)

interface Application {
    name: string
    path: string
    icon?: string
}

interface Preferences {
    searchPaths: string
    includePortableApps: boolean
}

async function findApplications(searchPaths: string[]): Promise<Application[]> {
    const applications: Application[] = []
    
    for (const searchPath of searchPaths) {
        try {
            const items = readdirSync(searchPath)
            
            for (const item of items) {
                const fullPath = join(searchPath, item)
                const stats = statSync(fullPath)
                
                if (stats.isFile() && extname(item).toLowerCase() === '.exe') {
                    applications.push({
                        name: item.replace('.exe', ''),
                        path: fullPath
                    })
                }
            }
        } catch (error) {
            console.warn(`Failed to search ${searchPath}:`, error)
        }
    }
    
    return applications.sort((a, b) => a.name.localeCompare(b.name))
}

async function launchApplication(appPath: string): Promise<void> {
    try {
        await execAsync(`"${appPath}"`)
        
        await showToast({
            style: Toast.Style.Success,
            title: "Application launched",
            message: appPath.split('\\').pop()
        })
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Failed to launch application",
            message: error instanceof Error ? error.message : "Unknown error"
        })
    }
}

export default function QuickApplicationLauncher() {
    const preferences = getPreferenceValues<Preferences>()
    
    const searchPaths = preferences.searchPaths
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0)
    
    const { data: applications, isLoading } = useCachedPromise(
        () => findApplications(searchPaths),
        []
    )

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Search applications...">
            {applications?.map((app) => (
                <List.Item
                    key={app.path}
                    icon={Icon.Desktop}
                    title={app.name}
                    subtitle={app.path}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Launch Application"
                                icon={Icon.Play}
                                onAction={() => launchApplication(app.path)}
                            />
                            <Action.ShowInFinder path={app.path} />
                            <Action.CopyToClipboard
                                title="Copy Path"
                                content={app.path}
                            />
                        </ActionPanel>
                    }
                />
            ))}
        </List>
    )
}
```

## 📝 Usage Notes

### Package.json Configuration for Examples

```json
{
  "commands": [
    {
      "name": "file-manager",
      "title": "File Manager",
      "description": "Browse and manage files",
      "mode": "view"
    },
    {
      "name": "system-info",
      "title": "System Information",
      "description": "View system details",
      "mode": "view"
    },
    {
      "name": "services-manager",
      "title": "Windows Services",
      "description": "Manage Windows services",
      "mode": "view"
    },
    {
      "name": "app-launcher",
      "title": "Quick Launcher",
      "description": "Launch applications quickly",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "searchPaths",
      "title": "Application Search Paths",
      "description": "Comma-separated list of directories to search for applications",
      "type": "textfield",
      "default": "C:\\Program Files,C:\\Program Files (x86)",
      "required": false
    },
    {
      "name": "includePortableApps",
      "title": "Include Portable Apps",
      "description": "Include portable applications in search results",
      "type": "checkbox",
      "default": true,
      "required": false,
      "label": "Search for portable applications"
    }
  ]
}
```

### Key Patterns Demonstrated

1. **UTF-8 Encoding**: All Windows commands use `chcp 65001` prefix
2. **Error Handling**: Comprehensive try-catch with user feedback
3. **Data Parsing**: Custom parsers for Windows command output
4. **Caching**: Using `useCachedPromise` for expensive operations
5. **User Preferences**: Configurable behavior through preferences
6. **Toast Notifications**: User feedback for all operations
7. **Action Panels**: Context-appropriate actions for each item

These examples provide a solid foundation for building Windows-specific Raycast extensions with proper error handling, user feedback, and Windows integration patterns.

---

*These examples are based on real-world patterns from successful Windows Raycast extensions. Adapt them to your specific use cases and requirements.*
