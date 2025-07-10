# Raycast API Reference

Comprehensive reference for the Raycast API with Windows-specific considerations.

## 📋 Table of Contents

- [Core Components](#core-components)
- [User Interface](#user-interface)
- [Utilities](#utilities)
- [Storage](#storage)
- [Preferences](#preferences)
- [OAuth](#oauth)
- [AI Integration](#ai-integration)
- [Cross-Extension Communication](#cross-extension-communication)

## 🎯 Core Components

### List Component
The most commonly used component for displaying searchable data.

```typescript
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Item Title"
        subtitle="Item Subtitle"
        accessories={[{ text: "Accessory" }]}
        actions={
          <ActionPanel>
            <Action title="Primary Action" onAction={() => {}} />
          </ActionPanel>
        }
      />
    </List>
  );
}
```

**Key Properties:**
- `isLoading: boolean` - Show loading indicator
- `searchText: string` - Control search text programmatically
- `onSearchTextChange: (text: string) => void` - Handle search changes
- `filtering: boolean | { keepSectionOrder?: boolean }` - Configure filtering behavior
- `pagination: PaginationOptions` - Enable pagination

### Form Component
For data input and configuration.

```typescript
import { Form, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name" />
      <Form.TextArea id="description" title="Description" />
      <Form.Dropdown id="category" title="Category">
        <Form.Dropdown.Item value="work" title="Work" />
        <Form.Dropdown.Item value="personal" title="Personal" />
      </Form.Dropdown>
      <Form.Checkbox id="enabled" title="Enabled" label="Enable feature" />
      <Form.DatePicker id="date" title="Date" />
    </Form>
  );
}
```

### Detail Component
For displaying detailed information with metadata.

```typescript
import { Detail } from "@raycast/api";

export default function Command() {
  const markdown = `
# Title

Content goes here...
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text="Active" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text="2024-01-01" />
        </Detail.Metadata>
      }
    />
  );
}
```

### Grid Component
For displaying items in a grid layout.

```typescript
import { Grid } from "@raycast/api";

export default function Command() {
  return (
    <Grid>
      <Grid.Item
        content="https://example.com/image.png"
        title="Item Title"
        subtitle="Item Subtitle"
      />
    </Grid>
  );
}
```

## 🎨 User Interface

### Actions
Actions define what users can do with items.

```typescript
import { ActionPanel, Action, Icon } from "@raycast/api";

function Actions() {
  return (
    <ActionPanel>
      <Action
        title="Open"
        icon={Icon.Globe}
        onAction={() => {}}
      />
      <Action.OpenInBrowser url="https://example.com" />
      <Action.CopyToClipboard content="Text to copy" />
      <Action.ShowInFinder path="/path/to/file" />
      <Action.Trash paths={["/path/to/file"]} />
      <Action.Push title="Details" target={<DetailView />} />
    </ActionPanel>
  );
}
```

### Toast Notifications
For user feedback and status updates.

```typescript
import { showToast, Toast } from "@raycast/api";

// Success toast
await showToast({
  style: Toast.Style.Success,
  title: "Operation completed",
  message: "Details about the operation"
});

// Failure toast
await showToast({
  style: Toast.Style.Failure,
  title: "Operation failed",
  message: "Error details"
});

// Animated toast (for ongoing operations)
const toast = await showToast({
  style: Toast.Style.Animated,
  title: "Processing..."
});

// Update the toast later
toast.style = Toast.Style.Success;
toast.title = "Completed";
```

### HUD (Heads-Up Display)
For quick status messages.

```typescript
import { showHUD } from "@raycast/api";

await showHUD("✅ File copied to clipboard");
```

## 🛠️ Utilities

### Application Management
```typescript
import { getApplications, getDefaultApplication, getFrontmostApplication } from "@raycast/api";

// Get all installed applications
const apps = await getApplications();

// Get default application for a file
const defaultApp = await getDefaultApplication("/path/to/file.txt");

// Get currently active application
const frontmostApp = await getFrontmostApplication();
```

### File Operations
```typescript
import { showInFinder, trash, open } from "@raycast/api";

// Show file in Finder
await showInFinder("/path/to/file");

// Move file to trash
await trash("/path/to/file");

// Open file with default application
await open("/path/to/file");

// Open file with specific application
await open("/path/to/file", "TextEdit");
```

### Clipboard Operations
```typescript
import { Clipboard } from "@raycast/api";

// Copy text to clipboard
await Clipboard.copy("Text to copy");

// Copy file to clipboard
await Clipboard.copy({ file: "/path/to/file" });

// Read from clipboard
const text = await Clipboard.readText();
```

### Environment Information
```typescript
import { environment } from "@raycast/api";

console.log("Extension name:", environment.extensionName);
console.log("Command name:", environment.commandName);
console.log("Is development:", environment.isDevelopment);
console.log("Raycast version:", environment.raycastVersion);
```

## 💾 Storage

### Local Storage
```typescript
import { LocalStorage } from "@raycast/api";

// Store data
await LocalStorage.setItem("key", "value");
await LocalStorage.setItem("number", 42);
await LocalStorage.setItem("boolean", true);

// Retrieve data
const value = await LocalStorage.getItem("key");

// Remove data
await LocalStorage.removeItem("key");

// Clear all data
await LocalStorage.clear();

// Get all items
const allItems = await LocalStorage.allItems();
```

## ⚙️ Preferences

### Reading Preferences
```typescript
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
  maxResults: string;
  enableNotifications: boolean;
}

const preferences = getPreferenceValues<Preferences>();
console.log(preferences.apiKey);
```

### Opening Preferences
```typescript
import { openExtensionPreferences } from "@raycast/api";

// Open extension preferences
await openExtensionPreferences();
```

## 🔐 OAuth

### PKCE Client
```typescript
import { OAuth } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "github-icon.png",
  description: "Connect your GitHub account"
});

// Create authorization request
const authRequest = await client.authorizationRequest({
  endpoint: "https://github.com/login/oauth/authorize",
  clientId: "your-client-id",
  scope: "repo user"
});

// Authorize
const authResponse = await client.authorize(authRequest);

// Store tokens
await client.setTokens(authResponse);

// Get stored tokens
const tokens = await client.getTokens();
```

## 🤖 AI Integration

### AI.ask
```typescript
import { AI } from "@raycast/api";

// Simple AI query
const answer = await AI.ask("What is the capital of France?");

// Streaming response
const stream = AI.ask("Write a poem about coding");
stream.on("data", (chunk) => {
  console.log(chunk);
});
await stream;
```

## 🔗 Cross-Extension Communication

### Launch Commands
```typescript
import { launchCommand, LaunchType } from "@raycast/api";

// Launch command in same extension
await launchCommand({
  name: "other-command",
  type: LaunchType.UserInitiated,
  context: { data: "some data" }
});

// Launch command in different extension
await launchCommand({
  name: "command-name",
  type: LaunchType.UserInitiated,
  extensionName: "extension-name",
  ownerOrAuthorName: "author-name"
});
```

## 🪟 Windows-Specific Considerations

### File Paths
```typescript
import { join } from "path";

// Use path.join for cross-platform compatibility
const userProfile = process.env.USERPROFILE || process.env.HOME || "";
const documentsPath = join(userProfile, "Documents");

// Handle Windows path separators
const windowsPath = "C:\\Users\\Username\\Documents";
const normalizedPath = windowsPath.replace(/\\/g, "/");
```

### Process Execution
```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runWindowsCommand(command: string) {
  try {
    // Set UTF-8 encoding for international characters
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const { stdout, stderr } = await execAsync(fullCommand);
    
    if (stderr) {
      throw new Error(stderr);
    }
    
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error}`);
  }
}
```

### Registry Access (if needed)
```typescript
// Note: Registry access requires additional dependencies
// Consider using libraries like 'winreg' for registry operations
```

---

*For complete API documentation, visit [developers.raycast.com](https://developers.raycast.com/)*
