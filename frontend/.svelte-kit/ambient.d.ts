
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const color_medium_gray: string;
	export const TMUX: string;
	export const GHOSTTY_RESOURCES_DIR: string;
	export const LANGUAGE: string;
	export const USER: string;
	export const npm_config_user_agent: string;
	export const XDG_SEAT: string;
	export const XDG_SESSION_TYPE: string;
	export const FZF_CTRL_T_COMMAND: string;
	export const FZF_DEFAULT_OPTS: string;
	export const npm_node_execpath: string;
	export const SHLVL: string;
	export const npm_config_noproxy: string;
	export const HOME: string;
	export const TERMINFO: string;
	export const OLDPWD: string;
	export const LESS: string;
	export const DESKTOP_SESSION: string;
	export const TERM_PROGRAM_VERSION: string;
	export const NVM_BIN: string;
	export const npm_package_json: string;
	export const icon_terminal_active: string;
	export const ZSH: string;
	export const LSCOLORS: string;
	export const NVM_INC: string;
	export const GTK_MODULES: string;
	export const XDG_SEAT_PATH: string;
	export const PAGER: string;
	export const _ZSH_TMUX_FIXED_CONFIG: string;
	export const LC_MONETARY: string;
	export const npm_config_userconfig: string;
	export const npm_config_local_prefix: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const color_dark_gray: string;
	export const GOROOT: string;
	export const npm_config_engine_strict: string;
	export const COLORTERM: string;
	export const color_light_gray: string;
	export const BAT_STYLE: string;
	export const COLOR: string;
	export const NVM_DIR: string;
	export const LOGNAME: string;
	export const _: string;
	export const npm_config_prefix: string;
	export const npm_config_npm_version: string;
	export const XDG_SESSION_CLASS: string;
	export const BAT_PAGER: string;
	export const GHOSTTY_SHELL_INTEGRATION_NO_SUDO: string;
	export const TERM: string;
	export const XDG_SESSION_ID: string;
	export const icon_terminal: string;
	export const npm_config_cache: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const GDM_LANG: string;
	export const GTK3_MODULES: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const LC_ADDRESS: string;
	export const XDG_RUNTIME_DIR: string;
	export const XDG_SESSION_PATH: string;
	export const DISPLAY: string;
	export const LANG: string;
	export const LC_TELEPHONE: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const TERM_PROGRAM: string;
	export const XAUTHORITY: string;
	export const XDG_SESSION_DESKTOP: string;
	export const LS_COLORS: string;
	export const ZSH_TMUX_TERM: string;
	export const npm_lifecycle_script: string;
	export const XDG_GREETER_DATA_DIR: string;
	export const GHOSTTY_BIN_DIR: string;
	export const LC_NAME: string;
	export const SHELL: string;
	export const GOPATH: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const GDMSESSION: string;
	export const QT_ACCESSIBILITY: string;
	export const LC_MEASUREMENT: string;
	export const GPG_AGENT_INFO: string;
	export const LC_IDENTIFICATION: string;
	export const XDG_VTNR: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const PWD: string;
	export const JAVA_HOME: string;
	export const FZF_DEFAULT_COMMAND: string;
	export const npm_execpath: string;
	export const XDG_CONFIG_DIRS: string;
	export const XDG_DATA_DIRS: string;
	export const ZSH_TMUX_CONFIG: string;
	export const NVM_CD_FLAGS: string;
	export const npm_config_global_prefix: string;
	export const LC_NUMERIC: string;
	export const npm_command: string;
	export const I3SOCK: string;
	export const LC_PAPER: string;
	export const TMUX_PLUGIN_MANAGER_PATH: string;
	export const TMUX_PANE: string;
	export const color_bright_gray: string;
	export const INIT_CWD: string;
	export const EDITOR: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		color_medium_gray: string;
		TMUX: string;
		GHOSTTY_RESOURCES_DIR: string;
		LANGUAGE: string;
		USER: string;
		npm_config_user_agent: string;
		XDG_SEAT: string;
		XDG_SESSION_TYPE: string;
		FZF_CTRL_T_COMMAND: string;
		FZF_DEFAULT_OPTS: string;
		npm_node_execpath: string;
		SHLVL: string;
		npm_config_noproxy: string;
		HOME: string;
		TERMINFO: string;
		OLDPWD: string;
		LESS: string;
		DESKTOP_SESSION: string;
		TERM_PROGRAM_VERSION: string;
		NVM_BIN: string;
		npm_package_json: string;
		icon_terminal_active: string;
		ZSH: string;
		LSCOLORS: string;
		NVM_INC: string;
		GTK_MODULES: string;
		XDG_SEAT_PATH: string;
		PAGER: string;
		_ZSH_TMUX_FIXED_CONFIG: string;
		LC_MONETARY: string;
		npm_config_userconfig: string;
		npm_config_local_prefix: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		color_dark_gray: string;
		GOROOT: string;
		npm_config_engine_strict: string;
		COLORTERM: string;
		color_light_gray: string;
		BAT_STYLE: string;
		COLOR: string;
		NVM_DIR: string;
		LOGNAME: string;
		_: string;
		npm_config_prefix: string;
		npm_config_npm_version: string;
		XDG_SESSION_CLASS: string;
		BAT_PAGER: string;
		GHOSTTY_SHELL_INTEGRATION_NO_SUDO: string;
		TERM: string;
		XDG_SESSION_ID: string;
		icon_terminal: string;
		npm_config_cache: string;
		npm_config_node_gyp: string;
		PATH: string;
		GDM_LANG: string;
		GTK3_MODULES: string;
		NODE: string;
		npm_package_name: string;
		LC_ADDRESS: string;
		XDG_RUNTIME_DIR: string;
		XDG_SESSION_PATH: string;
		DISPLAY: string;
		LANG: string;
		LC_TELEPHONE: string;
		XDG_CURRENT_DESKTOP: string;
		TERM_PROGRAM: string;
		XAUTHORITY: string;
		XDG_SESSION_DESKTOP: string;
		LS_COLORS: string;
		ZSH_TMUX_TERM: string;
		npm_lifecycle_script: string;
		XDG_GREETER_DATA_DIR: string;
		GHOSTTY_BIN_DIR: string;
		LC_NAME: string;
		SHELL: string;
		GOPATH: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		GDMSESSION: string;
		QT_ACCESSIBILITY: string;
		LC_MEASUREMENT: string;
		GPG_AGENT_INFO: string;
		LC_IDENTIFICATION: string;
		XDG_VTNR: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		PWD: string;
		JAVA_HOME: string;
		FZF_DEFAULT_COMMAND: string;
		npm_execpath: string;
		XDG_CONFIG_DIRS: string;
		XDG_DATA_DIRS: string;
		ZSH_TMUX_CONFIG: string;
		NVM_CD_FLAGS: string;
		npm_config_global_prefix: string;
		LC_NUMERIC: string;
		npm_command: string;
		I3SOCK: string;
		LC_PAPER: string;
		TMUX_PLUGIN_MANAGER_PATH: string;
		TMUX_PANE: string;
		color_bright_gray: string;
		INIT_CWD: string;
		EDITOR: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
