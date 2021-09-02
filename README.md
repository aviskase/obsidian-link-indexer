# obsidian-link-indexer

This plugin for [Obsidian](https://obsidian.md/) generates index notes with links based on various conditions.

[Read changelog here](https://github.com/aviskase/obsidian-link-indexer/releases/latest).

WARNING: I'm no longer using this plugin myself ¯\\\_(ツ)_/¯

## Usage

Plugin adds commands and settings for each type of index note.

You can have as many settings presets as you want, for example, one used links report for all data and another for non-existing files only.

To configure the plugin, go to plugin settings and add a preset with desired configuration. After that you'll see a new command added to the palette with the name `Link indexer: Used links - {name of the preset}`.

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

**Exclude links from files** and **Exclude links to files** allow skipping files during indexing. Both accept regex patterns. If you need several excludes, add them on separate lines. Exclusion is checked only for existing files and only for filename without path.

For example, if exclude *from* is set to `B`, the plugin won't count any links in this file and the output would be:

```
2 [[B]]
1 [[C]]
1 [[X]]
```

If exclude *to* is set to `B`, then any links to this file will be ignored, and the output will be:

```
2 [[C]]
1 [[X]]
```

If both exclude *from* and *to* are set to `B`, the the output will be:

```
1 [[C]]
1 [[X]]
```

**Exclude links from paths** and **Exclude links to paths** works similarly to filename exclusion, but accept glob patterns. Check [picomatch docs](https://www.npmjs.com/package/picomatch#globbing-features) for detailed information. Useful, when you want to exclude some directories, for example, exclude everything from directory *Dailies* is `Dailies/**/*`. 


## Compatibility
v0.0.1 was developed against Obsidian v0.9.12, but it may work in earlier versions (v0.9.7+).

Next releases will continue to target v0.9.12+.
