# Windows Compatibility Guide

Essential guide for making Raycast extensions compatible with Windows, based on analysis of successful Windows extensions and common patterns.

## 🎯 Platform Targeting

### Extension Manifest
Always specify Windows platform support in your `package.json`:

```json
{
  "platforms": ["windows"],
  // or for cross-platform extensions:
  "platforms": ["macOS", "windows"]
}
```

## 🗂️ File System Considerations

### Path Handling
Windows uses different path conventions than macOS/Linux.

```typescript
import { join, resolve, normalize } from "path";
import { homedir } from "os";

// ✅ Good: Use path.join() for cross-platform compatibility
const configPath = join(homedir(), ".config", "myapp", "config.json");

// ✅ Good: Use forward slashes or path utilities
const relativePath = join("src", "components", "MyComponent.tsx");

// ❌ Bad: Hardcoded path separators
const badPath = homedir() + "\\.config\\myapp\\config.json";

// ✅ Good: Environment variable handling
const userProfile = process.env.USERPROFILE || process.env.HOME || "";
const documentsPath = join(userProfile, "Documents");

// ✅ Good: Normalize paths from external sources
function normalizePath(path: string): string {
  return normalize(path.replace(/\\/g, "/"));
}
```

### Common Windows Directories
```typescript
// User directories
const userProfile = process.env.USERPROFILE; // C:\Users\Username
const appData = process.env.APPDATA;         // C:\Users\Username\AppData\Roaming
const localAppData = process.env.LOCALAPPDATA; // C:\Users\Username\AppData\Local
const temp = process.env.TEMP;               // C:\Users\Username\AppData\Local\Temp

// System directories
const programFiles = process.env.PROGRAMFILES;     // C:\Program Files
const programFilesX86 = process.env["PROGRAMFILES(X86)"]; // C:\Program Files (x86)
const systemRoot = process.env.SYSTEMROOT;         // C:\Windows
```

## 🖥️ Process Execution

### Running Windows Commands
```typescript
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ✅ UTF-8 encoding for international characters
async function runWindowsCommand(command: string): Promise<string> {
  try {
    // Set UTF-8 code page to handle international characters
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const { stdout, stderr } = await execAsync(fullCommand, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    if (stderr && !stderr.includes("Active code page")) {
      console.warn("Command stderr:", stderr);
    }
    
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const execError = error as any;
      if (execError.code === "ENOENT") {
        throw new Error("Command not found. Please ensure the tool is installed and in PATH.");
      }
    }
    throw new Error(`Command failed: ${error}`);
  }
}

// ✅ PowerShell execution
async function runPowerShellCommand(command: string): Promise<string> {
  const psCommand = `powershell.exe -NoProfile -Command "${command.replace(/"/g, '`"')}"`;
  return runWindowsCommand(psCommand);
}

// ✅ Example: Get running processes
async function getRunningProcesses() {
  const output = await runWindowsCommand('tasklist /fo csv /nh');
  return parseWindowsCSV(output);
}
```

### Handling Different Shells
```typescript
// Detect available shells
async function getAvailableShell(): Promise<string> {
  const shells = ["powershell.exe", "cmd.exe"];
  
  for (const shell of shells) {
    try {
      await execAsync(`where ${shell}`, { timeout: 1000 });
      return shell;
    } catch {
      continue;
    }
  }
  
  return "cmd.exe"; // fallback
}
```

## 📊 Data Parsing

### CSV Output Parsing
Many Windows commands output CSV format.

```typescript
function parseWindowsCSV(csvOutput: string): string[][] {
  return csvOutput
    .trim()
    .split(/\r?\n/) // Handle both \r\n and \n line endings
    .map(line => {
      // Remove quotes and split by comma
      return line.replace(/"/g, "").split(",");
    })
    .filter(parts => parts.length > 0 && parts[0]); // Filter empty lines
}

// ✅ Example: Parse process list
interface WindowsProcess {
  name: string;
  pid: string;
  sessionName: string;
  sessionNumber: string;
  memUsage: string;
}

function parseProcessList(csvOutput: string): WindowsProcess[] {
  const rows = parseWindowsCSV(csvOutput);
  return rows.map(row => ({
    name: row[0] || "",
    pid: row[1] || "",
    sessionName: row[2] || "",
    sessionNumber: row[3] || "",
    memUsage: row[4] || ""
  }));
}
```

### Registry Data Parsing
```typescript
// Example: Parse registry query output
function parseRegistryOutput(output: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = output.split(/\r?\n/);
  
  for (const line of lines) {
    const match = line.match(/^\s*(\w+)\s+REG_\w+\s+(.+)$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  
  return result;
}
```

## 🔧 External Tool Integration

### Tool Detection
```typescript
async function isToolAvailable(toolName: string): Promise<boolean> {
  try {
    await execAsync(`where ${toolName}`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// ✅ Example: Check for Everything search tool
async function checkEverythingTool(): Promise<boolean> {
  const possiblePaths = [
    "es.exe", // If in PATH
    join(process.env.PROGRAMFILES || "", "Everything", "es.exe"),
    join(process.env["PROGRAMFILES(X86)"] || "", "Everything", "es.exe")
  ];
  
  for (const path of possiblePaths) {
    try {
      await execAsync(`"${path}" -h`, { timeout: 2000 });
      return true;
    } catch {
      continue;
    }
  }
  
  return false;
}
```

### Common Windows Tools Integration
```typescript
// ✅ Windows Terminal integration
async function openInWindowsTerminal(path: string) {
  const command = `wt.exe -d "${path}"`;
  await runWindowsCommand(command);
}

// ✅ File Explorer integration
async function openInExplorer(path: string) {
  const command = `explorer.exe "${path}"`;
  await runWindowsCommand(command);
}

// ✅ PowerToys integration (if available)
async function runPowerToysRun(query: string) {
  // PowerToys Run can be triggered via hotkey simulation
  // This is a conceptual example
  const command = `powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^{SPACE}'); Start-Sleep -Milliseconds 100; [System.Windows.Forms.SendKeys]::SendWait('${query}')"`;
  await runWindowsCommand(command);
}
```

## 🎨 UI Considerations

### Icons and Assets
```typescript
// ✅ Use appropriate icons for Windows context
import { Icon } from "@raycast/api";

const windowsIcons = {
  folder: Icon.Folder,
  file: Icon.Document,
  executable: Icon.Gear,
  powershell: Icon.Terminal,
  registry: Icon.Cog,
  service: Icon.Circle
};
```

### Keyboard Shortcuts
```typescript
// ✅ Windows-friendly keyboard shortcuts
import { Keyboard } from "@raycast/api";

const windowsShortcuts = {
  copy: { modifiers: ["ctrl"], key: "c" },
  paste: { modifiers: ["ctrl"], key: "v" },
  selectAll: { modifiers: ["ctrl"], key: "a" },
  find: { modifiers: ["ctrl"], key: "f" },
  refresh: { key: "f5" }
};
```

## ⚠️ Error Handling

### Windows-Specific Error Handling
```typescript
import { showToast, Toast, captureException } from "@raycast/api";

async function handleWindowsError(error: unknown, context: string) {
  console.error(`${context}:`, error);
  
  let message = "Unknown error occurred";
  
  if (error instanceof Error) {
    // Handle common Windows errors
    if (error.message.includes("ENOENT")) {
      message = "Command or file not found. Please check if the required tool is installed.";
    } else if (error.message.includes("EACCES")) {
      message = "Access denied. Please run with administrator privileges if needed.";
    } else if (error.message.includes("EPERM")) {
      message = "Operation not permitted. File may be in use or protected.";
    } else {
      message = error.message;
    }
  }
  
  captureException(error);
  
  await showToast({
    style: Toast.Style.Failure,
    title: `${context} failed`,
    message: message
  });
}
```

## 🔒 Security Considerations

### Safe Command Execution
```typescript
// ✅ Sanitize user input for command execution
function sanitizeCommandInput(input: string): string {
  // Remove potentially dangerous characters
  return input.replace(/[&|;$`\\<>]/g, "");
}

// ✅ Use parameterized commands when possible
async function safeFileOperation(filePath: string) {
  // Validate file path
  if (!filePath || filePath.includes("..")) {
    throw new Error("Invalid file path");
  }
  
  const normalizedPath = normalize(filePath);
  const command = `type "${normalizedPath}"`;
  
  return runWindowsCommand(command);
}
```

## 📦 Dependencies and Installation

### Windows-Specific Dependencies
```json
{
  "dependencies": {
    "@raycast/api": "^1.88.0",
    "@raycast/utils": "^1.18.0"
  },
  "optionalDependencies": {
    "winreg": "^1.2.4",
    "node-windows": "^1.0.0-beta.8"
  }
}
```

### Installation Instructions
```markdown
## Windows Requirements

1. **Node.js**: Version 18 or higher
2. **PowerShell**: Version 5.1 or higher (usually pre-installed)
3. **Windows Terminal**: Recommended for better CLI experience
4. **Git**: For version control and some extensions

## Optional Tools
- **Everything**: For file search functionality
- **PowerToys**: For additional Windows utilities
- **Windows Subsystem for Linux (WSL)**: For Unix-like commands
```

## 🧪 Testing on Windows

### Test Checklist
- [ ] File paths work correctly
- [ ] Commands execute with proper encoding
- [ ] Error messages are user-friendly
- [ ] External tools are detected properly
- [ ] UI elements display correctly
- [ ] Keyboard shortcuts work as expected
- [ ] Performance is acceptable

### Common Issues and Solutions
1. **Encoding Issues**: Always use UTF-8 encoding (`chcp 65001`)
2. **Path Separators**: Use `path.join()` instead of hardcoded separators
3. **Command Not Found**: Check PATH and provide installation instructions
4. **Permission Errors**: Handle gracefully and suggest solutions
5. **Long Paths**: Be aware of Windows path length limitations

---

*This guide is based on analysis of successful Windows Raycast extensions and common Windows development patterns.*
