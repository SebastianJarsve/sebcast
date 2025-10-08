# Changelog

All notable changes to rhttp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [UNRELEASED] - 2025-10-xx

### Initial Release

A complete HTTP client for Raycast with advanced features for API testing and development.

#### Added

- **Full HTTP Client** - Support for GET, POST, PUT, PATCH, DELETE, and GraphQL requests
- **Environment Management** - Multiple environments with variable substitution using `{{placeholder}}` syntax
- **Request Chaining** - Pre-request actions for authentication flows and multi-step workflows
- **Response Actions** - Extract data from responses and save to variables (temporary or persistent)
- **Collections** - Organize requests into collections with shared headers
- **Request History** - Automatic tracking of requests and responses with toggle to enable/disable
- **Cookie Management** - Automatic cookie handling across requests
- **cURL Support** - Import from cURL commands and export requests as cURL
- **Collection Import/Export** - Share collections as JSON files
- **Request Cancellation** - Stop long-running requests
- **Backup/Restore** - Export all data with timestamps
- **Secret Variables** - Mark sensitive variables as secrets (hidden in UI)
- **JSON Explorer** - Interactive JSON response viewer with search and navigation
- **Request Sorting** - Sort by name, method, URL, or manual order
- **Open in Editor** - View responses in your preferred text editor
- **Keyboard-First Design** - Every action has a keyboard shortcut

#### Technical

- Built with TypeScript and Zod for type safety
- Persistent storage using nanostores with file-based adapters
- Comprehensive error handling and validation
- Axios for HTTP requests with custom SSL verification options
