# Sebcast

## Getting started

It's pretty simple to install any of the extensions. You simply `cd` into the folder, and run
`pnpm install && pnpm dev`. Then the extension should be installed, and you may `Ctrl-c` out of development mode.

## About the extensions

### rhttp

This is a simple http client, it supports the most common HTTP endpoint, as well as a custom one for GraphQL, which is
actually just implemented as a `POST`. With `rhttp` you may organize requests in collections. You can import and export
collections, which is easy since it's just stored as `json`.

### cmds

This is where you would store some useful commands, may it be clever oneliners for `bash` or `powershell`, or some cool
`vim` commands. It comes with some default commands that I've used from time to time, but you may also just discard them
and build up your own little database of commands.

### tools

This is a collection of small tools that doesn't really need its own extension.
