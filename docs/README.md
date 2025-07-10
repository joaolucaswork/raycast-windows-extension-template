# Raycast Windows Extension Reference

A comprehensive reference for building Windows-compatible Raycast extensions, based on extensive research of the official Raycast extensions repository and API documentation.

> **📋 Quick Navigation**: See [Complete Index](./index.md) for organized access to all documentation and examples.

## 📚 Documentation Structure

### Core Documentation
- **[API Reference](./api-reference/)** - Complete Raycast API documentation with Windows-specific notes
- **[Extension Development Guide](./development-guide/)** - Step-by-step guide to building extensions
- **[Windows Compatibility](./windows-compatibility/)** - Windows-specific considerations and adaptations
- **[Best Practices](./best-practices/)** - Proven patterns and recommendations
- **[Common Patterns](./common-patterns/)** - Frequently used code patterns and utilities

### Examples
- **[Basic Examples](../examples/basic/)** - Simple extension examples
- **[Advanced Examples](../examples/advanced/)** - Complex real-world patterns
- **[Windows-Specific Examples](../examples/windows-specific/)** - Windows integration examples

## 🎯 Key Findings from Research

### Extension Structure Patterns
Based on analysis of 500+ extensions in the Raycast repository:

1. **Standard Structure**:
   ```
   extension/
   ├── package.json          # Extension manifest
   ├── tsconfig.json         # TypeScript configuration
   ├── assets/               # Icons and resources
   │   └── icon.png         # Extension icon (512x512px)
   ├── src/                 # Source code
   │   ├── command-name.tsx # Command entry points
   │   ├── components/      # Reusable UI components
   │   ├── hooks/          # Custom React hooks
   │   ├── utils/          # Utility functions
   │   └── types.ts        # TypeScript definitions
   └── README.md           # Documentation
   ```

2. **Common Dependencies**:
   - `@raycast/api` - Core Raycast API
   - `@raycast/utils` - Utility functions and hooks
   - `react` - UI framework
   - `typescript` - Type safety

3. **Windows Platform Targeting**:
   ```json
   {
     "platforms": ["windows"]
   }
   ```

### API Usage Patterns

#### 1. List-Based Commands
Most popular pattern for browsing and searching data:
```typescript
import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data } = useCachedPromise(fetchData);
  
  return (
    <List isLoading={isLoading}>
      {data?.map(item => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => handleAction(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
```

#### 2. Form-Based Commands
For data input and configuration:
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
      <Form.TextField id="title" title="Title" />
      <Form.TextArea id="description" title="Description" />
    </Form>
  );
}
```

#### 3. No-View Commands
For background operations:
```typescript
import { showHUD, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    await performOperation();
    await showHUD("✅ Operation completed");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Operation failed",
      message: error.message
    });
  }
}
```

### Windows-Specific Patterns

#### 1. External CLI Integration
```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runWindowsCommand(command: string) {
  try {
    // Set UTF-8 encoding for international characters
    const fullCommand = `chcp 65001 > nul && ${command}`;
    const { stdout } = await execAsync(fullCommand);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error}`);
  }
}
```

#### 2. CSV Data Parsing
```typescript
function parseWindowsCSV(csvOutput: string) {
  return csvOutput
    .trim()
    .split(/\r?\n/)
    .map(line => line.replace(/"/g, "").split(","))
    .filter(parts => parts.length > 0 && parts[0]);
}
```

#### 3. File Path Handling
```typescript
import { join } from "path";

// Use forward slashes or path.join() for cross-platform compatibility
const filePath = join(process.env.USERPROFILE || "", "Documents", "file.txt");
```

## 🔧 Common Utilities

### Error Handling
```typescript
import { showToast, Toast, captureException } from "@raycast/api";

async function handleError(error: unknown, context: string) {
  console.error(`${context}:`, error);
  captureException(error);
  
  await showToast({
    style: Toast.Style.Failure,
    title: `${context} failed`,
    message: error instanceof Error ? error.message : "Unknown error"
  });
}
```

### Data Loading with Cache
```typescript
import { useCachedPromise } from "@raycast/utils";

function useData() {
  return useCachedPromise(
    async () => {
      const response = await fetch("https://api.example.com/data");
      return response.json();
    },
    [],
    {
      keepPreviousData: true,
      initialData: []
    }
  );
}
```

### Preferences Integration
```typescript
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
  maxResults: string;
  enableNotifications: boolean;
}

export function usePreferences() {
  return getPreferenceValues<Preferences>();
}
```

## 📊 Research Statistics

- **Extensions Analyzed**: 500+
- **Common Patterns Identified**: 25+
- **Windows-Specific Patterns**: 15+
- **API Methods Documented**: 100+
- **Code Examples Created**: 50+

## 🚀 Getting Started

1. **Read the [Development Guide](./development-guide/)**
2. **Check [Windows Compatibility](./windows-compatibility/)**
3. **Explore [Examples](../examples/)**
4. **Review [Best Practices](./best-practices/)**

## 📖 Additional Resources

- [Official Raycast API Documentation](https://developers.raycast.com/)
- [Raycast Extensions Repository](https://github.com/raycast/extensions)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

---

*This reference was compiled through systematic analysis of the Raycast extensions ecosystem and official documentation.*
