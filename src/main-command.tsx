import { Action, ActionPanel, Icon, List, showToast, Toast, getPreferenceValues } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { useState } from "react"
import { getWindowsPaths } from "./utils/windows-helpers"

interface Preferences {
    exampleSetting: string
    enableFeature: boolean
}

interface ListItem {
    id: string
    title: string
    subtitle?: string
    icon: string
}

const preferences: Preferences = getPreferenceValues()

// Example function that simulates loading data
async function loadData(): Promise<ListItem[]> {
    // Simulate API call or data loading
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const items: ListItem[] = [
        {
            id: "1",
            title: "Example Item 1",
            subtitle: "This is an example item",
            icon: "📄"
        },
        {
            id: "2", 
            title: "Example Item 2",
            subtitle: "Another example item",
            icon: "📋"
        },
        {
            id: "3",
            title: "Windows Specific Item",
            subtitle: `Setting: ${preferences.exampleSetting}`,
            icon: "🪟"
        },
        {
            id: "4",
            title: "Windows Paths",
            subtitle: `User Profile: ${getWindowsPaths().userProfile}`,
            icon: "📁"
        }
    ]

    // Filter based on preferences if feature is enabled
    if (preferences.enableFeature) {
        items.push({
            id: "4",
            title: "Feature Enabled Item",
            subtitle: "This item only shows when the feature is enabled",
            icon: "✨"
        })
    }

    await showToast({
        style: Toast.Style.Success,
        title: "Data loaded",
        message: `Found ${items.length} items`,
    })

    return items
}

async function handleItemAction(item: ListItem) {
    try {
        // Example action - you can replace this with your own logic
        await showToast({
            style: Toast.Style.Success,
            title: "Action completed",
            message: `Performed action on ${item.title}`,
        })
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Action failed",
            message: error instanceof Error ? error.message : "Unknown error occurred",
        })
    }
}

export default function Command() {
    const [searchText, setSearchText] = useState("")
    const { data: items, isLoading, revalidate } = useCachedPromise(loadData)

    // Filter items based on search text
    const filteredItems = items?.filter(item => 
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(searchText.toLowerCase())
    ) || []

    return (
        <List 
            isLoading={isLoading} 
            searchBarPlaceholder="Search items..."
            onSearchTextChange={setSearchText}
            searchText={searchText}
        >
            {filteredItems.map((item: ListItem) => (
                <List.Item
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    icon={item.icon}
                    actions={
                        <ActionPanel>
                            <Action 
                                title="Perform Action" 
                                icon={Icon.Checkmark} 
                                onAction={() => handleItemAction(item)} 
                            />
                            <Action
                                title="Reload Data"
                                icon={Icon.ArrowClockwise}
                                onAction={revalidate}
                                shortcut={{ modifiers: ["cmd"], key: "r" }}
                            />
                            <Action.CopyToClipboard
                                title="Copy Title"
                                content={item.title}
                                shortcut={{ modifiers: ["cmd"], key: "c" }}
                            />
                        </ActionPanel>
                    }
                />
            ))}
            {!isLoading && filteredItems.length === 0 && (
                <List.EmptyView
                    title="No items found"
                    description={searchText ? "No items match your search." : "No items available."}
                    actions={
                        <ActionPanel>
                            <Action 
                                title="Reload Data" 
                                icon={Icon.ArrowClockwise} 
                                onAction={revalidate} 
                            />
                        </ActionPanel>
                    }
                />
            )}
        </List>
    )
}
