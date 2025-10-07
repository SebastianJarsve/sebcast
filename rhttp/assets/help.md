# Getting Started

## Creating Your First Request

1. **Create a Collection** - Press `Cmd+Shift+N`
2. **Add a Request** - Press `Cmd+N`
3. **Configure the request:**
   - Choose HTTP method (GET, POST, etc.)
   - Enter URL: `https://api.example.com/users`
   - Add headers if needed (`Cmd+H`)
4. **Run it** - Press `Cmd+Enter` or click "Run Request"

That's it! 🎉

## Using Variables

Variables let you reuse values across requests.

### 1. Create an Environment

- Go to "Manage Environments" (`Cmd+Shift+V`)
- Add variables like `baseUrl`, `apiKey`, etc.

### 2. Use in Requests

Use double curly braces: `{{variableName}}`

**Example:**

```
URL: {{baseUrl}}/users
Header: Authorization: Bearer {{apiToken}}
```

### Global vs Environment Variables

- **Globals** - Available in all environments
- **Environment-specific** - Override globals per environment

## Pre-Request Actions

Run requests before another request (e.g., login first).

### Example: Authentication Flow

**1. Login Request**

- POST `/auth/login`
- Response Action: Extract `token` → save to `authToken` (TEMPORARY)

**2. Get Profile Request**

- GET `/user/profile`
- Header: `Authorization: Bearer {{authToken}}`
- **Pre-Request:** ✓ Run "Login Request"

Now when you run "Get Profile", it automatically logs in first!

### Storage Options

- **TEMPORARY** - Only during request chain (recommended for tokens)
- **ENVIRONMENT** - Saved permanently

# Features

## Response Actions

Extract data from responses to use in other requests.

### Setup

1. In your request form, add a Response Action (`Opt+R`)
2. Choose source: Body (JSON) or Header
3. Enter path: e.g., `data.token` or `x-auth-token`
4. Save to variable: e.g., `authToken`
5. Choose storage: TEMPORARY or ENVIRONMENT

### Use Cases

- Extract auth tokens
- Get user IDs for subsequent requests
- Store pagination cursors
- Save API response data

## Request Chaining

Combine Pre-Request Actions + Response Actions for complex workflows.

### Example: Multi-Step Flow

**Request 1: Login**

- Extract: `token` → `authToken`

**Request 2: Get User**

- Pre-Request: Login
- Uses: `{{authToken}}` in header
- Extract: `user.id` → `userId`

**Request 3: Get User Posts**

- Pre-Request: Get User
- URL: `/users/{{userId}}/posts`
- Uses: `{{authToken}}` + `{{userId}}`

Run Request 3 → automatically runs 1, then 2, then 3! 🎯

## cURL Import/Export

### Import from cURL

1. Copy a cURL command (from browser DevTools, docs, etc.)
2. Press "New Request from cURL"
3. The request is automatically parsed!

### Export to cURL

1. Select any request
2. Press `Cmd+Shift+C` or choose "Copy as cURL"
3. Paste in terminal or share with teammates

Perfect for debugging or sharing requests! 📋

## History

Every request you run is saved in history (if enabled).

### Features

- View past requests and responses
- Re-run historical requests
- See which environment was active
- Filter by request

### Access History

Press `Cmd+Shift+H` or use "View History" action

### Enable/Disable

Toggle history recording with `Cmd+Shift+D`

History is saved locally and never shared.

# Keyboard Shortcuts

## Request Management

- `Cmd+N` - New Request
- `Cmd+E` - Edit/Open Request
- `Cmd+O` - Run Request
- `Ctrl+X` - Delete Request
- `Cmd+M` - Move to Collection
- `Cmd+Shift+C` - Copy as cURL

## Collections

- `Cmd+Shift+N` - New Collection
- `Cmd+Shift+E` - Edit Collection
- `Cmd+Shift+Delete` - Delete Collection

## Form Actions

- `Cmd+H` - Add Header
- `Ctrl+H` - Remove Header
- `Opt+R` - Add Response Action
- `Ctrl+R` - Remove Response Action
- `Opt+P` - Add Pre-Request Action
- `Ctrl+P` - Remove Pre-Request Action
- `Cmd+S` - Save Request

## Global

- `Cmd+Shift+V` - Manage Environments
- `Cmd+Shift+P` - Select Environment
- `Cmd+Shift+I` - Copy Variable Placeholder
- `Cmd+Shift+H` - View History
- `Cmd+Shift+D` - Toggle History Recording
- `Cmd+Shift+B` - Backup All Data
- `Cmd+Shift+S` - Sort Requests
- `Cmd+?` - Help & Documentation

# Tips & Tricks

## Best Practices

### Organization

✅ Use descriptive request titles\
✅ Group related requests in collections\
✅ Use environments for dev/staging/prod\
✅ Use emojis to differentiate environments (🔧 Dev, 🚧 Staging, 🚀 Production)\
✅ Sort requests for easy navigation

### Variables

✅ Use TEMPORARY storage for auth tokens\
✅ Use ENVIRONMENT storage for API keys\
✅ Mark sensitive values as "Secret"\
✅ Use `{{baseUrl}}` for portable collections

### Security

✅ Cookies are handled automatically\
✅ Secret variables are hidden in UI\
✅ All data stored locally only\
✅ Use backup feature regularly

### Debugging

✅ Check History to see past requests\
✅ Use "Copy as cURL" to test in terminal\
✅ Enable/disable Pre-Request Actions to isolate issues\
✅ Clear cookies if having auth issues

## Troubleshooting

### Request Not Working?

1. Check if variables are defined in active environment
2. Verify URL is correct (check for typos)
3. Look at History to see what was actually sent
4. Copy as cURL and test in terminal

### Variables Not Substituting?

1. Make sure environment is selected
2. Check variable name matches exactly (`{{varName}}`)
3. Variable must exist in active environment or Globals

### Pre-Request Not Running?

1. Check that it's enabled (checkbox)
2. Verify the pre-request is selected (dropdown)
3. Make sure Response Actions extract to correct variable names

### Authentication Issues?

1. Clear all cookies (Global Actions → Clear All Cookies)
2. Check if token is being extracted (use ENVIRONMENT storage temporarily to verify)
3. Verify token is being used in header correctly

### Still Having Issues?

Check the Raycast logs for error messages or contact support.
