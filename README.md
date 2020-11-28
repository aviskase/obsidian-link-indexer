# obsidian-link-indexer

This plugin for [Obsidian](https://obsidian.md/) generates index notes with links based on various conditions.

[Read changelog here](https://github.com/aviskase/obsidian-link-indexer/releases/latest).

## Usage

Plugin adds commands and settings for each type of index note.

You can have as many settings presets as you want, for example, one used links report for all data and another for non-existing files only.

### Used links

Vault had:

- note A with links B and C
- note B with link C
- note C with link to B and non-existing note X

Command will create an index note (check path in settings) with the content:

```
2 [[B]]
2 [[C]]
1 [[X]]
```

#### Output options

**Include embeds** counts both `![[file]]` and `[[file]]` links. When disabled, it will count only `[[file]]` links.

**Nonexistent files only**. When enabled, the example above would generate a note with only `1 [[X]]`.

**Strict line breaks** corresponds to the same Editor setting: "off" = one line break, "on" = two line breaks.

On:

```
2 [[B]]

2 [[C]]

1 [[X]]
```

Off:

```
2 [[B]]
2 [[C]]
1 [[X]]
```

**Link to files**. When "on" the output file will use wiki-links to files. Disable if you don\'t want to pollute graph with it.

On:

```
2 [[B]]
2 [[C]]
1 [[X]]
```

Off:

```
2 B
2 C
1 X
```


## Compatibility
v0.0.1 was developed against Obsidian v0.9.12, but it may work in earlier versions (v0.9.7+).

Next releases will continue to target v0.9.12+.