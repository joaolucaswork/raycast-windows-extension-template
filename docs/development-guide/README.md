# Raycast Extension Development Guide

Complete guide to developing Raycast extensions for Windows, from setup to publishing.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **TypeScript**: Basic knowledge recommended
- **React**: Familiarity with React concepts
- **Raycast**: Installed on your system

### Development Environment Setup

1. **Install Raycast CLI**:
   ```bash
   npm install -g @raycast/api
   ```

2. **Create New Extension**:
   ```bash
   npx create-raycast-extension
   ```

3. **Development Commands**:
   ```bash
   # Start development mode
   npm run dev
   
   # Build for production
   npm run build
   
   # Lint code
   npm run lint
   
   # Fix linting issues
   npm run fix-lint
   ```

## 📁 Project Structure

### Essential Files
```
my-extension/
├── package.json          # Extension manifest and metadata
├── tsconfig.json         # TypeScript configuration
├── README.md             # Extension documentation
├── assets/               # Icons and static resources
│   └── icon.png         # Extension icon (512x512px)
├── src/                 # Source code
│   ├── index.tsx        # Main command file
│   ├── components/      # Reusable components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── types.ts        # TypeScript definitions
└── metadata/           # Auto-generated store metadata
```

### Package.json Configuration
```json
{
  "name": "my-extension",
  "title": "My Extension",
  "description": "Description of what the extension does",
  "icon": "icon.png",
  "author": "your-name",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "search",
      "title": "Search Items",
      "description": "Search through items",
      "mode": "view"
    },
    {
      "name": "create",
      "title": "Create Item",
      "description": "Create a new item",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "apiKey",
      "title": "API Key",
      "description": "Your API key for authentication",
      "type": "password",
      "required": true
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.88.0",
    "@raycast/utils": "^1.18.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.11",
    "@types/node": "20.8.10",
    "@types/react": "18.3.3",
    "eslint": "^8.57.0",
    "prettier": "^3.0.3",
    "typescript": "^5.4.5"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "prepublishOnly": "echo \"\\n\\nIt seems like you are trying to publish the Raycast extension to npm.\\n\\nIf you did intend to publish it to npm, remove the \\`prepublishOnly\\` script and rerun \\`npm publish\\` again.\\nIf you wanted to publish it to the Raycast Store instead, use \\`npm run publish\\` instead.\\n\\n\" && exit 1",
    "publish": "npx @raycast/api@latest publish"
  },
  "platforms": ["windows"]
}
```

## 🎯 Command Types

### 1. View Commands
Most common type - displays a UI interface.

```typescript
import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Item Title"
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

### 2. No-View Commands
Background operations without UI.

```typescript
import { showHUD, showToast, Toast } from "@raycast/api";

export default async function Command() {
  try {
    // Perform operation
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

### 3. Menu Bar Commands
Always-visible menu bar items.

```typescript
import { MenuBarExtra, open } from "@raycast/api";

export default function Command() {
  return (
    <MenuBarExtra icon="icon.png" tooltip="My Extension">
      <MenuBarExtra.Item
        title="Open App"
        onAction={() => open("https://example.com")}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Settings"
        onAction={() => {}}
      />
    </MenuBarExtra>
  );
}
```

## 🎨 UI Components

### List Component
```typescript
import { List, Icon } from "@raycast/api";

<List
  isLoading={isLoading}
  onSearchTextChange={setSearchText}
  searchBarPlaceholder="Search..."
  filtering={false} // Handle filtering manually
  pagination={{
    pageSize: 20,
    hasMore: hasMore,
    onLoadMore: loadMore
  }}
>
  <List.Section title="Section Title">
    <List.Item
      icon={Icon.Document}
      title="Item Title"
      subtitle="Item Subtitle"
      accessories={[
        { text: "Accessory" },
        { icon: Icon.Star, tooltip: "Favorite" }
      ]}
      actions={/* ActionPanel */}
    />
  </List.Section>
</List>
```

### Form Component
```typescript
import { Form, ActionPanel, Action } from "@raycast/api";

<Form
  actions={
    <ActionPanel>
      <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
    </ActionPanel>
  }
>
  <Form.TextField
    id="title"
    title="Title"
    placeholder="Enter title"
    error={errors.title}
  />
  
  <Form.TextArea
    id="description"
    title="Description"
    placeholder="Enter description"
  />
  
  <Form.Dropdown id="category" title="Category">
    <Form.Dropdown.Item value="work" title="Work" />
    <Form.Dropdown.Item value="personal" title="Personal" />
  </Form.Dropdown>
  
  <Form.Checkbox
    id="enabled"
    title="Settings"
    label="Enable feature"
  />
  
  <Form.DatePicker
    id="date"
    title="Date"
  />
</Form>
```

### Detail Component
```typescript
import { Detail } from "@raycast/api";

const markdown = `
# Title

Content with **markdown** support.

## Features
- Feature 1
- Feature 2
`;

<Detail
  markdown={markdown}
  navigationTitle="Detail View"
  metadata={
    <Detail.Metadata>
      <Detail.Metadata.Label title="Status" text="Active" />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="Website"
        text="example.com"
        target="https://example.com"
      />
      <Detail.Metadata.TagList title="Tags">
        <Detail.Metadata.TagList.Item text="Tag 1" color="#FF0000" />
        <Detail.Metadata.TagList.Item text="Tag 2" color="#00FF00" />
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  }
  actions={/* ActionPanel */}
/>
```

## 🔧 Data Management

### Using @raycast/utils
```typescript
import { useCachedPromise, useFetch } from "@raycast/utils";

// Cached API calls
const { data, isLoading, revalidate } = useCachedPromise(
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

// Direct fetch with built-in caching
const { data, isLoading } = useFetch("https://api.example.com/data", {
  parseResponse: (response) => response.json(),
  keepPreviousData: true
});
```

### Local Storage
```typescript
import { LocalStorage } from "@raycast/api";

// Store data
await LocalStorage.setItem("key", JSON.stringify(data));

// Retrieve data
const stored = await LocalStorage.getItem("key");
const data = stored ? JSON.parse(stored) : null;

// Remove data
await LocalStorage.removeItem("key");

// Clear all
await LocalStorage.clear();
```

## 🔐 Authentication

### OAuth Integration
```typescript
import { OAuth } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "github-icon.png",
  description: "Connect your GitHub account"
});

// Authorization flow
const authRequest = await client.authorizationRequest({
  endpoint: "https://github.com/login/oauth/authorize",
  clientId: "your-client-id",
  scope: "repo user"
});

const authResponse = await client.authorize(authRequest);
await client.setTokens(authResponse);

// Use tokens
const tokens = await client.getTokens();
```

## 🧪 Testing and Debugging

### Development Best Practices
```typescript
// Use environment checks
import { environment } from "@raycast/api";

if (environment.isDevelopment) {
  console.log("Debug info:", data);
}

// Error boundaries
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  captureException(error); // Reports to Raycast
}

// Loading states
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function loadData() {
    try {
      setIsLoading(true);
      const data = await fetchData();
      setData(data);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }
  
  loadData();
}, []);
```

### Common Debugging Techniques
1. **Console Logging**: Use `console.log()` for development debugging
2. **Toast Messages**: Show user-friendly error messages
3. **Error Reporting**: Use `captureException()` for production errors
4. **Network Inspection**: Check API calls and responses
5. **State Debugging**: Log component state changes

## 📦 Publishing

### Pre-publish Checklist
- [ ] Extension works correctly in development
- [ ] All commands have proper error handling
- [ ] README.md is complete and accurate
- [ ] Icons are properly sized (512x512px)
- [ ] No console errors or warnings
- [ ] Preferences are documented
- [ ] Extension follows Raycast guidelines

### Publishing Process
```bash
# Build the extension
npm run build

# Publish to Raycast Store
npm run publish
```

### Store Guidelines
- **Icon**: 512x512px PNG, clean and recognizable
- **Title**: Clear and descriptive (max 30 characters)
- **Description**: Explains what the extension does
- **Categories**: Choose appropriate categories
- **Screenshots**: Show the extension in action
- **README**: Comprehensive documentation

## 🔄 Maintenance

### Version Management
```json
{
  "version": "1.2.3",
  "changelog": "Added new search functionality and improved error handling"
}
```

### Update Process
1. Make changes to your extension
2. Update version number in package.json
3. Add changelog entry
4. Test thoroughly
5. Publish update

### Monitoring
- Monitor user feedback and reviews
- Track error reports through Raycast
- Keep dependencies updated
- Respond to user issues promptly

---

*This guide provides the foundation for building professional Raycast extensions. Refer to the [API Reference](../api-reference/) and [Best Practices](../best-practices/) for more detailed information.*
