# obsidian-link-indexer

This plugin for [Obsidian](https://obsidian.md/) generates index notes with links based on various conditions.

## Usage

Plugin adds commands and setting for each type of index note.

### All used links

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

### Output options

**Strict line breaks** corresponds to the same Editor setting: "off" = one line break, "on" = two line breaks.

| on | off |
| -- | -- |
| 2 [[B]]<br><br>2 [[C]]<br><br>1 [[X]] | 2 [[B]]<br>2 [[C]]<br>1 [[X]] |

**Link to files**. When "on" the output file will use wiki-links to files. Disable if you don\'t want to pollute graph with it.

| on | off |
| -- | -- |
| 2 [[B]]<br>2 [[C]]<br>1 [[X]] | 2 B<br>2 C<br>1 X |


## Compatibility
v0.0.1 was developed against Obsidian v0.9.12, but it may work in earlier versions (v0.9.7+).

Next releases will continue to target v0.9.12+.