# Raycast Extension Best Practices

Essential best practices for building high-quality Raycast extensions, based on analysis of successful extensions and official guidelines.

## 🏗️ Project Structure

### Recommended Directory Layout
```
extension/
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration  
├── README.md                # Documentation
├── CHANGELOG.md             # Version history
├── assets/                  # Static resources
│   ├── icon.png            # Main extension icon (512x512px)
│   ├── icon@dark.png       # Dark theme variant (optional)
│   └── command-icons/      # Individual command icons
├── src/                    # Source code
│   ├── commands/           # Command entry points
│   │   ├── search.tsx
│   │   └── create.tsx
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Shared components
│   │   └── specific/       # Command-specific components
│   ├── hooks/              # Custom React hooks
│   │   ├── useData.ts
│   │   └── usePreferences.ts
│   ├── services/           # External API integrations
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── utils/              # Utility functions
│   │   ├── formatting.ts
│   │   └── validation.ts
│   └── types/              # TypeScript definitions
│       └── index.ts
└── metadata/               # Store metadata (auto-generated)
```

### File Naming Conventions
- **Commands**: Use kebab-case matching the command name in package.json
- **Components**: Use PascalCase for React components
- **Utilities**: Use camelCase for utility functions
- **Types**: Use PascalCase for interfaces and types

## 📝 Code Quality

### TypeScript Best Practices
```typescript
// ✅ Define clear interfaces
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ✅ Use proper error types
type ApiError = {
  message: string;
  code: number;
  details?: Record<string, unknown>;
};

// ✅ Prefer type guards
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && 
         obj !== null && 
         'id' in obj && 
         'name' in obj;
}

// ✅ Use proper async/await patterns
async function fetchUserData(id: string): Promise<User | null> {
  try {
    const response = await api.get(`/users/${id}`);
    return isUser(response.data) ? response.data : null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

### React Patterns
```typescript
// ✅ Use custom hooks for data fetching
function useUsers() {
  return useCachedPromise(
    async () => {
      const users = await fetchUsers();
      return users;
    },
    [],
    {
      keepPreviousData: true,
      initialData: []
    }
  );
}

// ✅ Memoize expensive computations
const filteredUsers = useMemo(() => {
  return users.filter(user => 
    user.name.toLowerCase().includes(searchText.toLowerCase())
  );
}, [users, searchText]);

// ✅ Use proper error boundaries
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorView />}>
      {children}
    </ErrorBoundary>
  );
}
```

## 🎨 User Experience

### Loading States
```typescript
// ✅ Always show loading states
<List isLoading={isLoading}>
  {data?.map(item => (
    <List.Item key={item.id} title={item.title} />
  ))}
</List>

// ✅ Use skeleton loading for better UX
{isLoading ? (
  <List>
    {Array.from({ length: 5 }).map((_, i) => (
      <List.Item key={i} title="Loading..." />
    ))}
  </List>
) : (
  <List>
    {data.map(item => <List.Item key={item.id} title={item.title} />)}
  </List>
)}
```

### Error Handling
```typescript
// ✅ Comprehensive error handling
async function handleAction() {
  try {
    await performAction();
    await showToast({
      style: Toast.Style.Success,
      title: "Action completed successfully"
    });
  } catch (error) {
    console.error('Action failed:', error);
    
    await showToast({
      style: Toast.Style.Failure,
      title: "Action failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
    
    // Report to Raycast for debugging
    captureException(error);
  }
}

// ✅ Graceful degradation
function DataComponent() {
  const { data, error, isLoading } = useData();
  
  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load data"
          description="Please try again later"
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refetch} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  
  return <List isLoading={isLoading}>{/* ... */}</List>;
}
```

### Search and Filtering
```typescript
// ✅ Implement proper search
function useSearch<T>(items: T[], searchFields: (keyof T)[]) {
  const [searchText, setSearchText] = useState("");
  
  const filteredItems = useMemo(() => {
    if (!searchText) return items;
    
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
```

## ⚡ Performance

### Data Loading Optimization
```typescript
// ✅ Use caching appropriately
const { data, isLoading, revalidate } = useCachedPromise(
  fetchData,
  [],
  {
    keepPreviousData: true,
    initialData: [],
    // Cache for 5 minutes
    cacheTime: 5 * 60 * 1000
  }
);

// ✅ Implement pagination for large datasets
function usePaginatedData() {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const { data, isLoading } = useCachedPromise(
    async () => {
      return await fetchPaginatedData(page, pageSize);
    },
    [page]
  );
  
  return { data, isLoading, page, setPage, hasMore: data?.hasMore };
}

// ✅ Debounce search input
const debouncedSearchText = useDebounce(searchText, 300);
```

### Memory Management
```typescript
// ✅ Clean up resources
useEffect(() => {
  const controller = new AbortController();
  
  fetchData(controller.signal).then(setData);
  
  return () => {
    controller.abort();
  };
}, []);

// ✅ Limit data size
const limitedData = useMemo(() => {
  return data.slice(0, 1000); // Limit to 1000 items
}, [data]);
```

## 🔧 Configuration

### Preferences Design
```json
{
  "preferences": [
    {
      "name": "apiKey",
      "title": "API Key",
      "description": "Your API key for authentication",
      "type": "password",
      "required": true
    },
    {
      "name": "maxResults",
      "title": "Maximum Results",
      "description": "Maximum number of results to display",
      "type": "textfield",
      "default": "50",
      "required": false
    },
    {
      "name": "enableNotifications",
      "title": "Notifications",
      "description": "Enable desktop notifications",
      "type": "checkbox",
      "default": true,
      "required": false,
      "label": "Show notifications"
    }
  ]
}
```

### Environment-Specific Configuration
```typescript
// ✅ Handle different environments
import { environment } from "@raycast/api";

const config = {
  apiUrl: environment.isDevelopment 
    ? "http://localhost:3000/api"
    : "https://api.production.com",
  debug: environment.isDevelopment,
  timeout: environment.isDevelopment ? 30000 : 10000
};
```

## 🔒 Security

### Input Validation
```typescript
// ✅ Validate user input
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// ✅ Validate API responses
function validateApiResponse(response: unknown): response is ApiResponse {
  return typeof response === 'object' &&
         response !== null &&
         'data' in response;
}
```

### Secure Storage
```typescript
// ✅ Use appropriate storage for sensitive data
import { LocalStorage } from "@raycast/api";

// For non-sensitive data
await LocalStorage.setItem("user-preferences", JSON.stringify(preferences));

// For sensitive data, use preferences (encrypted)
const { apiKey } = getPreferenceValues<{ apiKey: string }>();
```

## 📚 Documentation

### README Structure
```markdown
# Extension Name

Brief description of what the extension does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Setup

1. Install the extension
2. Configure your API key in preferences
3. Start using the commands

## Commands

### Command Name
Description of what the command does.

### Another Command
Description of another command.

## Preferences

- **API Key**: Your authentication key
- **Max Results**: Maximum number of results to show

## Troubleshooting

Common issues and solutions.
```

### Code Comments
```typescript
/**
 * Fetches user data from the API with caching and error handling
 * @param userId - The unique identifier for the user
 * @param options - Additional options for the request
 * @returns Promise that resolves to user data or null if not found
 */
async function fetchUser(
  userId: string, 
  options: FetchOptions = {}
): Promise<User | null> {
  // Implementation
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] All commands work as expected
- [ ] Search functionality works correctly
- [ ] Actions perform their intended operations
- [ ] Error states are handled gracefully
- [ ] Loading states are shown appropriately
- [ ] Preferences are respected
- [ ] Performance is acceptable with large datasets

### Error Scenarios to Test
- [ ] Network failures
- [ ] Invalid API responses
- [ ] Missing permissions
- [ ] Rate limiting
- [ ] Empty data sets
- [ ] Malformed user input

## 📦 Publishing

### Pre-publish Checklist
- [ ] All lint errors resolved
- [ ] README is complete and accurate
- [ ] CHANGELOG is updated
- [ ] Icons are properly sized (512x512px)
- [ ] Extension works in both development and production
- [ ] All preferences are documented
- [ ] Error handling is comprehensive

### Version Management
```json
{
  "version": "1.2.3",
  "changelog": "Added new search functionality and improved error handling"
}
```

---

*Following these best practices will help you create high-quality, maintainable Raycast extensions that provide excellent user experiences.*
