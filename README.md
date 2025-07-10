# Raycast Windows Extension Template

A clean, minimal template for creating Windows-compatible Raycast extensions. This template provides the essential structure and components needed to build Raycast extensions that work specifically on Windows platforms.

**Enhanced with real-world patterns**: This template incorporates best practices and techniques discovered from analyzing successful Windows Raycast extensions in the wild.

## 🚀 Quick Start

1. **Clone or download this template**
2. **Customize the extension**:
   - Update `package.json` with your extension details
   - Modify `src/main-command.tsx` with your functionality
   - Replace `assets/icon.png` with your extension icon
3. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```
4. **Start development**:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
raycast-windows-extension-template/
├── assets/
│   └── icon.png              # Extension icon (64x64px recommended)
├── src/
│   └── main-command.tsx      # Main command component
├── package.json              # Extension manifest and dependencies
├── tsconfig.json            # TypeScript configuration
├── raycast-env.d.ts         # Auto-generated type definitions
└── README.md                # This file
```

## 🔧 Key Components

### package.json
The extension manifest that defines:
- **Extension metadata** (name, title, description, author)
- **Windows platform targeting** (`"platforms": ["windows"]`)
- **Commands** that appear in Raycast
- **Preferences** for user configuration
- **Dependencies** and build scripts

### src/main-command.tsx
A React component demonstrating:
- **List interface** with search functionality
- **Action panels** with multiple actions
- **Toast notifications** for user feedback
- **Preferences integration**
- **Data loading** with caching
- **Error handling** patterns

### TypeScript Configuration
- **Windows-compatible** TypeScript settings
- **React JSX** support
- **Strict type checking** enabled
- **ES2021** target for modern JavaScript features

## 🛠️ Customization Guide

### 1. Update Extension Metadata

Edit `package.json`:

```json
{
  "name": "your-extension-name",
  "title": "Your Extension Title",
  "description": "What your extension does",
  "author": "your-name",
  "categories": ["Developer Tools"], // Choose appropriate category
}
```

### 2. Configure Commands

Add or modify commands in `package.json`:

```json
{
  "commands": [
    {
      "name": "your-command",
      "title": "Your Command Title", 
      "description": "Command description",
      "mode": "view" // or "no-view" for background commands
    }
  ]
}
```

### 3. Add Preferences

Configure user preferences in `package.json`:

```json
{
  "preferences": [
    {
      "name": "settingName",
      "title": "Setting Display Name",
      "description": "Setting description",
      "type": "textfield", // textfield, checkbox, dropdown, etc.
      "default": "default value",
      "required": false
    }
  ]
}
```

### 4. Implement Your Logic

Replace the example code in `src/main-command.tsx` with your functionality:

```typescript
// Access preferences
const preferences = getPreferenceValues<Preferences>()

// Load your data
async function loadYourData() {
  // Your data loading logic here
  return yourData
}

// Handle actions
async function handleYourAction(item: YourItemType) {
  // Your action logic here
}
```

## 🪟 Windows-Specific Considerations

### File Paths
- Use forward slashes `/` or `path.join()` for cross-platform compatibility
- Be aware of Windows path length limitations
- Handle Windows-specific environment variables (`process.env.USERNAME`, `process.env.USERPROFILE`)

### Process Execution
- Use `child_process.exec()` or `child_process.spawn()` for running Windows commands
- Consider PowerShell vs Command Prompt differences
- Handle Windows-specific executable extensions (`.exe`, `.bat`, `.cmd`)

### External CLI Tool Integration
- Many Windows tools provide CLI interfaces (Everything, PowerToys, etc.)
- Use UTF-8 encoding for international character support
- Handle tool availability gracefully

### Registry Access
- Use appropriate libraries for Windows Registry access if needed
- Handle permissions carefully

### Example Windows Integration:
```typescript
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Execute Windows command with UTF-8 encoding
async function runWindowsCommand(command: string) {
  try {
    // Set UTF-8 encoding for international characters
    const fullCommand = `chcp 65001 > nul && ${command}`
    const { stdout } = await execAsync(fullCommand)
    return stdout.trim()
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as any).code === "ENOENT") {
      throw new Error("Command not found. Please ensure the tool is installed and in PATH.")
    }
    throw new Error(`Command failed: ${error}`)
  }
}

// Parse CSV output from Windows commands
function parseWindowsCSV(csvOutput: string) {
  return csvOutput
    .trim()
    .split(/\r?\n/)
    .map(line => line.replace(/"/g, "").split(","))
    .filter(parts => parts.length > 0 && parts[0])
}
```

## 📦 Available Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix ESLint issues
- `npm run publish` - Publish to Raycast Store (when Windows support is available)

## 🔗 Dependencies

### Core Dependencies
- `@raycast/api` - Raycast API for building extensions
- `@raycast/utils` - Utility functions and hooks

### Development Dependencies
- `typescript` - TypeScript compiler
- `eslint` - Code linting
- `prettier` - Code formatting
- `@types/*` - Type definitions

## 📚 Documentation

### 🎯 Quick Start
- **[Template Guide](docs/template-guide/)** - Template-specific documentation and examples
- **[Complete Documentation Index](docs/index.md)** - Comprehensive reference for Raycast extensions

### 📖 Additional Documentation
- **[Research Summary](RESEARCH_SUMMARY.md)** - Comprehensive analysis of 500+ Raycast extensions
- **[Documentation Organization](DOCUMENTATION_ORGANIZATION.md)** - How the documentation is structured

## 📚 Resources

- [Raycast Extensions Documentation](https://developers.raycast.com/)
- [Raycast API Reference](https://developers.raycast.com/api-reference)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

## 🤝 Contributing

1. Fork this template
2. Create your feature branch
3. Make your changes
4. Test thoroughly on Windows
5. Submit a pull request

## 📄 License

MIT License - feel free to use this template for your own extensions.

## 🙏 Credits & Inspiration

This template was created by analyzing and extracting patterns from real-world Windows Raycast extensions:

### Foundation
- **[Windows Terminal Profiles Extension](https://github.com/PuttTim/windows-terminal)** by PuttTim
  - Provided the foundational structure and Windows platform configuration
  - Demonstrated essential Raycast extension patterns for Windows
  - Showed proper preferences integration and toast notifications

### Advanced Patterns
- **[Everything Search Extension](https://github.com/dougfernando/everything-raycast-extension)** by dougfernando
  - External CLI tool integration with Everything search
  - Advanced file operations and preview functionality
  - Custom explorer command parsing with placeholder substitution
  - Dynamic detail views and file type detection
  - UTF-8 encoding handling for international characters

- **[Kill Processes Extension](https://github.com/dougfernando/kill-processes-ext)** by dougfernando
  - Windows process management and CSV parsing
  - Bulk operations with error recovery
  - Real-time data updates and auto-refresh patterns
  - Robust error handling that continues operation even when some items fail

### Key Learnings Incorporated
- **External CLI Integration**: Patterns for integrating with Windows command-line tools
- **CSV Data Parsing**: Techniques for parsing Windows command output
- **Dynamic UI Patterns**: Conditional action ordering and detail views
- **Error Recovery**: Robust error handling that gracefully handles partial failures
- **Memory Efficiency**: Data loading patterns that prevent memory issues
- **User Customization**: Advanced preference handling with command parsing

Special thanks to these developers for creating open-source Windows Raycast extensions that demonstrate real-world patterns and best practices.

## ⚠️ Notes

- Windows-only extensions are not yet supported in the official Raycast Store
- You can install and test extensions locally using `npm run dev`
- This template incorporates patterns from multiple successful Windows extensions
- Ensure your extension works properly on Windows before publishing
