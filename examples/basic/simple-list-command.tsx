/**
 * Simple List Command Example
 * 
 * This example demonstrates a basic list-based Raycast command that:
 * - Displays a list of items
 * - Supports search functionality
 * - Includes actions for each item
 * - Shows loading states
 * - Handles errors gracefully
 */

import { useState, useEffect } from "react";
import { 
  List, 
  ActionPanel, 
  Action, 
  showToast, 
  Toast, 
  Icon,
  getPreferenceValues 
} from "@raycast/api";

// Define the data structure
interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  url?: string;
  icon?: string;
}

// Define preferences interface
interface Preferences {
  maxResults: string;
  showSubtitles: boolean;
}

// Mock data - replace with your actual data source
const mockData: ListItem[] = [
  {
    id: "1",
    title: "First Item",
    subtitle: "This is the first item",
    description: "Detailed description of the first item",
    url: "https://example.com/1",
    icon: "📄"
  },
  {
    id: "2", 
    title: "Second Item",
    subtitle: "This is the second item",
    description: "Detailed description of the second item",
    url: "https://example.com/2",
    icon: "📋"
  },
  {
    id: "3",
    title: "Third Item", 
    subtitle: "This is the third item",
    description: "Detailed description of the third item",
    url: "https://example.com/3",
    icon: "📊"
  }
];

// Simulate async data loading
async function loadData(): Promise<ListItem[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate potential error (uncomment to test error handling)
  // if (Math.random() > 0.8) {
  //   throw new Error("Failed to load data from server");
  // }
  
  return mockData;
}

export default function Command() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  
  const preferences = getPreferenceValues<Preferences>();
  const maxResults = parseInt(preferences.maxResults) || 10;

  // Load data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const data = await loadData();
        setItems(data);
      } catch (error) {
        console.error("Failed to load data:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "Unknown error occurred"
        });
        setItems([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter items based on search text
  const filteredItems = items.filter(item => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.subtitle?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }).slice(0, maxResults);

  // Handle item actions
  async function handleCopyTitle(item: ListItem) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: item.title
    });
  }

  async function handleViewDetails(item: ListItem) {
    await showToast({
      style: Toast.Style.Success,
      title: "Viewing details",
      message: `Selected: ${item.title}`
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search items..."
      throttle={true}
    >
      {filteredItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No items found"
          description={searchText ? `No items match "${searchText}"` : "No items available"}
        />
      ) : (
        filteredItems.map((item) => (
          <List.Item
            key={item.id}
            icon={item.icon || Icon.Document}
            title={item.title}
            subtitle={preferences.showSubtitles ? item.subtitle : undefined}
            accessories={[
              { text: `ID: ${item.id}` }
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Primary Actions">
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => handleViewDetails(item)}
                  />
                  {item.url && (
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={item.url}
                    />
                  )}
                </ActionPanel.Section>
                
                <ActionPanel.Section title="Copy Actions">
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={item.title}
                    onCopy={() => handleCopyTitle(item)}
                  />
                  {item.url && (
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={item.url}
                    />
                  )}
                  {item.description && (
                    <Action.CopyToClipboard
                      title="Copy Description"
                      content={item.description}
                    />
                  )}
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
 * Usage Notes:
 * 
 * 1. Replace mockData and loadData() with your actual data source
 * 2. Customize the ListItem interface to match your data structure
 * 3. Add more actions as needed for your use case
 * 4. Configure preferences in package.json:
 * 
 * "preferences": [
 *   {
 *     "name": "maxResults",
 *     "title": "Maximum Results",
 *     "description": "Maximum number of items to display",
 *     "type": "textfield",
 *     "default": "10",
 *     "required": false
 *   },
 *   {
 *     "name": "showSubtitles",
 *     "title": "Show Subtitles",
 *     "description": "Display subtitles for list items",
 *     "type": "checkbox",
 *     "default": true,
 *     "required": false,
 *     "label": "Show subtitles in list"
 *   }
 * ]
 */
