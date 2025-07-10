/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Example Setting - An example preference setting */
  "exampleSetting": string,
  /** Enable Feature - Enable or disable a feature */
  "enableFeature": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `main-command` command */
  export type MainCommand = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `main-command` command */
  export type MainCommand = {}
}
