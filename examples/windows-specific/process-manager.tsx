/**
 * Windows Process Manager Example
 * 
 * This example demonstrates Windows-specific functionality:
 * - Running Windows commands with proper encoding
 * - Parsing CSV output from Windows tools
 * - Handling Windows-specific errors
 * - Process management operations
 * - Bulk operations with error recovery
 */

import { useState, useEffect } from "react";
import { 
  List, 
  ActionPanel, 
  Action, 
  showToast, 
  Toast, 
  Icon,
  Alert,
  confirmAlert,
  getPreferenceValues
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Windows process interface
interface WindowsProcess {
  name: string;
  pid: string;
  sessionName: string;
  sessionNumber: string;
  memUsage: string;
  status?: "Running" | "Suspended" | "Unknown";
}

interface Preferences {
  showSystemProcesses: boolean;
  refreshInterval: string;
}

// Windows-specific utility functions
async function runWindowsCommand(command: string): Promise<string> {
  try {
    // Set UTF-8 encoding for international characters
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const { stdout, stderr } = await execAsync(fullCommand, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024, // 1MB buffer
      timeout: 10000 // 10 second timeout
    });
    
    if (stderr && !stderr.includes("Active code page")) {
      console.warn("Command stderr:", stderr);
    }
    
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const execError = error as any;
      if (execError.code === "ENOENT") {
        throw new Error("Command not found. Please ensure Windows is properly configured.");
      }
      if (execError.code === "EACCES") {
        throw new Error("Access denied. Administrator privileges may be required.");
      }
    }
    throw new Error(`Command failed: ${error}`);
  }
}

function parseWindowsCSV(csvOutput: string): string[][] {
  return csvOutput
    .trim()
    .split(/\r?\n/) // Handle both \r\n and \n line endings
    .map(line => {
      // Remove quotes and split by comma, handling embedded commas
      const parts: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      return parts;
    })
    .filter(parts => parts.length > 0 && parts[0]); // Filter empty lines
}

// Process management functions
async function getRunningProcesses(): Promise<WindowsProcess[]> {
  try {
    const output = await runWindowsCommand('tasklist /fo csv /nh');
    const rows = parseWindowsCSV(output);
    
    return rows.map(row => ({
      name: row[0] || "",
      pid: row[1] || "",
      sessionName: row[2] || "",
      sessionNumber: row[3] || "",
      memUsage: row[4] || "",
      status: "Running" as const
    })).filter(process => process.name && process.pid);
  } catch (error) {
    console.error("Failed to get processes:", error);
    throw new Error(`Failed to retrieve process list: ${error}`);
  }
}

async function killProcess(pid: string): Promise<void> {
  try {
    await runWindowsCommand(`taskkill /PID ${pid} /F`);
  } catch (error) {
    throw new Error(`Failed to kill process ${pid}: ${error}`);
  }
}

async function killProcessByName(name: string): Promise<void> {
  try {
    await runWindowsCommand(`taskkill /IM "${name}" /F`);
  } catch (error) {
    throw new Error(`Failed to kill process ${name}: ${error}`);
  }
}

// Format memory usage for display
function formatMemoryUsage(memUsage: string): string {
  const cleanUsage = memUsage.replace(/[,\s]/g, "");
  const bytes = parseInt(cleanUsage) * 1024; // tasklist shows KB
  
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  } else {
    return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
  }
}

export default function ProcessManager() {
  const [processes, setProcesses] = useState<WindowsProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  
  const preferences = getPreferenceValues<Preferences>();
  const refreshInterval = parseInt(preferences.refreshInterval) || 5000;

  // Load processes
  async function loadProcesses() {
    try {
      setIsLoading(true);
      const processData = await getRunningProcesses();
      
      // Filter system processes if preference is disabled
      const filteredProcesses = preferences.showSystemProcesses 
        ? processData 
        : processData.filter(p => p.sessionName !== "Services");
      
      setProcesses(filteredProcesses);
    } catch (error) {
      console.error("Failed to load processes:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load processes",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
      setProcesses([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-refresh processes
  useEffect(() => {
    loadProcesses();
    
    const interval = setInterval(loadProcesses, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, preferences.showSystemProcesses]);

  // Filter processes based on search
  const filteredProcesses = processes.filter(process => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    return (
      process.name.toLowerCase().includes(searchLower) ||
      process.pid.includes(searchText)
    );
  });

  // Handle process termination
  async function handleKillProcess(process: WindowsProcess) {
    const confirmed = await confirmAlert({
      title: "Kill Process",
      message: `Are you sure you want to kill "${process.name}" (PID: ${process.pid})?`,
      primaryAction: {
        title: "Kill Process",
        style: Alert.ActionStyle.Destructive
      }
    });

    if (!confirmed) return;

    try {
      await killProcess(process.pid);
      await showToast({
        style: Toast.Style.Success,
        title: "Process killed",
        message: `${process.name} (PID: ${process.pid}) has been terminated`
      });
      
      // Refresh the list
      await loadProcesses();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to kill process",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  // Handle bulk process termination by name
  async function handleKillAllByName(processName: string) {
    const matchingProcesses = processes.filter(p => p.name === processName);
    
    const confirmed = await confirmAlert({
      title: "Kill All Processes",
      message: `Are you sure you want to kill all ${matchingProcesses.length} instances of "${processName}"?`,
      primaryAction: {
        title: "Kill All",
        style: Alert.ActionStyle.Destructive
      }
    });

    if (!confirmed) return;

    try {
      await killProcessByName(processName);
      await showToast({
        style: Toast.Style.Success,
        title: "Processes killed",
        message: `All instances of ${processName} have been terminated`
      });
      
      // Refresh the list
      await loadProcesses();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to kill processes",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search processes by name or PID..."
      throttle={true}
    >
      {filteredProcesses.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="No processes found"
          description={searchText ? `No processes match "${searchText}"` : "No processes available"}
        />
      ) : (
        filteredProcesses.map((process) => (
          <List.Item
            key={`${process.name}-${process.pid}`}
            icon={Icon.ComputerChip}
            title={process.name}
            subtitle={`PID: ${process.pid}`}
            accessories={[
              { text: formatMemoryUsage(process.memUsage) },
              { text: process.sessionName }
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Process Actions">
                  <Action
                    title="Kill Process"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() => handleKillProcess(process)}
                  />
                  <Action
                    title="Kill All by Name"
                    icon={Icon.StopFilled}
                    style={Action.Style.Destructive}
                    onAction={() => handleKillAllByName(process.name)}
                  />
                </ActionPanel.Section>
                
                <ActionPanel.Section title="Information">
                  <Action.CopyToClipboard
                    title="Copy PID"
                    content={process.pid}
                  />
                  <Action.CopyToClipboard
                    title="Copy Process Name"
                    content={process.name}
                  />
                </ActionPanel.Section>
                
                <ActionPanel.Section title="Refresh">
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    onAction={loadProcesses}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

/**
 * Package.json configuration:
 * 
 * {
 *   "commands": [
 *     {
 *       "name": "process-manager",
 *       "title": "Process Manager",
 *       "description": "View and manage Windows processes",
 *       "mode": "view"
 *     }
 *   ],
 *   "preferences": [
 *     {
 *       "name": "showSystemProcesses",
 *       "title": "Show System Processes",
 *       "description": "Include system and service processes in the list",
 *       "type": "checkbox",
 *       "default": false,
 *       "required": false,
 *       "label": "Show system processes"
 *     },
 *     {
 *       "name": "refreshInterval",
 *       "title": "Refresh Interval",
 *       "description": "How often to refresh the process list (in milliseconds)",
 *       "type": "textfield",
 *       "default": "5000",
 *       "required": false
 *     }
 *   ],
 *   "platforms": ["windows"]
 * }
 */
