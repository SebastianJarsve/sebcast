# RHTTP - HTTP Client for Raycast

A powerful HTTP client built for Raycast. Test APIs, manage environments, and chain requests - all without leaving your keyboard.

## ✨ Features

### 🚀 Full HTTP Client

- Support for **GET**, **POST**, **PUT**, **PATCH**, **DELETE**, and **GraphQL**
- Custom headers, query parameters, and request bodies
- JSON and Form Data body types
- Cookie management across requests
- SSL verification control for local development

### 🔗 Request Chaining

- **Pre-request actions** - Run requests before your main request
- **Response actions** - Extract data from responses and save to variables
- Perfect for authentication flows (login → get token → use token)

### 🌍 Environment Management

- Multiple environments (Dev, Staging, Production, etc.)
- Global variables shared across all environments
- Variable substitution with `{{placeholder}}` syntax
- Secret variables (hidden values)
- Temporary variables scoped to request chains

### 📦 Collections

- Organize requests into collections
- Collection-level headers applied to all requests
- Import/export collections for sharing
- Sort requests by name, method, or URL

### 📜 Request History

- Automatic history tracking
- View past requests and responses
- Re-run requests from history
- Toggle history recording on/off

### ⚡ Power User Features

- **Import from cURL** - Paste cURL commands to create requests
- **Export as cURL** - Copy any request as a cURL command
- **Request cancellation** - Stop long-running requests
- **Backup/restore** - Export all data with timestamps
- **Open in editor** - View responses in your preferred editor
- **Keyboard-first** - Every action has a shortcut

## 🤝 Contributing

Found a bug? Have a feature request?

- Open an issue on GitHub
- Reach out on Twitter
- Join the Raycast community Slack

## 📄 License

THE BEER-WARE LICENSE (Revision 42) - see LICENSE file for details.

If you find this extension useful, you can buy me a beer! 🍺

## 🙏 Acknowledgments

Built with:

- [Raycast API](https://developers.raycast.com/)
- [Axios](https://axios-http.com/)
- [Zod](https://zod.dev/)
- [@sebastianjarsve/persistent-atom](https://github.com/sebastianjarsve/persistent-atom)

---

Made with ❤️ for the Raycast community
